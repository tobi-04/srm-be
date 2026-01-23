import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Queue } from "bullmq";
import {
  EmailAutomation,
  EmailAutomationDocument,
  TriggerType,
} from "../entities/email-automation.entity";
import {
  EmailAutomationStep,
  EmailAutomationStepDocument,
} from "../entities/email-automation-step.entity";
import { EmailAutomationService } from "./email-automation.service";
import { EmailJobData } from "../processors/email-automation.processor";

/**
 * Service responsible for checking and queuing scheduled emails
 * This runs periodically to find emails that need to be sent based on scheduled_at
 */
@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    @InjectModel(EmailAutomation.name)
    private automationModel: Model<EmailAutomationDocument>,
    @InjectModel(EmailAutomationStep.name)
    private stepModel: Model<EmailAutomationStepDocument>,
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private automationService: EmailAutomationService,
  ) {}

  /**
   * Run every minute to check for scheduled emails
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledEmails() {
    this.logger.debug("Checking for scheduled emails...");

    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find steps with scheduled_at in the next 5 minutes
      const scheduledSteps = await this.stepModel
        .find({
          scheduled_at: {
            $gte: now,
            $lte: fiveMinutesFromNow,
          },
          is_deleted: false,
        })
        .exec();

      if (scheduledSteps.length === 0) {
        this.logger.debug("No scheduled emails found in the next 5 minutes");
        return;
      }

      this.logger.log(
        `Found ${scheduledSteps.length} scheduled step(s) in the next 5 minutes`,
      );

      // Group steps by automation
      const stepsByAutomation = new Map<string, EmailAutomationStep[]>();
      for (const step of scheduledSteps) {
        const automationId = step.automation_id.toString();
        if (!stepsByAutomation.has(automationId)) {
          stepsByAutomation.set(automationId, []);
        }
        stepsByAutomation.get(automationId).push(step);
      }

      // Process each automation
      for (const [automationId, steps] of stepsByAutomation) {
        await this.processScheduledAutomation(automationId, steps);
      }
    } catch (error) {
      this.logger.error("Error checking scheduled emails:", error.stack);
    }
  }

  /**
   * Process scheduled emails for a specific automation
   */
  private async processScheduledAutomation(
    automationId: string,
    steps: EmailAutomationStep[],
  ) {
    try {
      // Get automation details
      const automation = await this.automationModel.findOne({
        _id: new Types.ObjectId(automationId),
        is_deleted: false,
      });

      if (!automation) {
        this.logger.warn(`Automation ${automationId} not found or deleted`);
        return;
      }

      if (!automation.is_active) {
        this.logger.warn(`Automation ${automationId} is not active`);
        return;
      }

      // Only process GROUP type automations with scheduled_at
      // Event-based automations are handled by the event listener
      if (automation.trigger_type !== TriggerType.GROUP) {
        this.logger.debug(
          `Skipping event-based automation ${automation.name} - handled by event listener`,
        );
        return;
      }

      // Get target users using the EmailAutomationService (which has proper logic)
      const userIds = await this.automationService.getTargetUserIds(
        automation.target_group,
      );

      if (userIds.length === 0) {
        this.logger.warn(
          `No target users found for automation ${automation.name} with target group ${automation.target_group}`,
        );
        return;
      }

      this.logger.log(
        `Processing ${steps.length} scheduled step(s) for ${userIds.length} user(s) in automation ${automation.name}`,
      );

      // Queue emails for each step and user
      const today = new Date().toISOString().split("T")[0];

      for (const step of steps) {
        const scheduledTime = new Date(step.scheduled_at).getTime();
        const now = Date.now();
        const delayMs = Math.max(0, scheduledTime - now);

        for (const userId of userIds) {
          await this.emailQueue.add(
            "email-job",
            {
              userId,
              automationId: automation._id.toString(),
              stepId: step._id.toString(),
              broadcastKey: `${today}-scheduled`,
              eventData: {
                scheduledDate: step.scheduled_at,
                processedAt: new Date(),
              },
            },
            {
              delay: delayMs,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 60000,
              },
            },
          );
        }

        this.logger.log(
          `Queued ${userIds.length} email(s) for step ${step.step_order}, scheduled at ${step.scheduled_at}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing scheduled automation ${automationId}:`,
        error.stack,
      );
    }
  }
}
