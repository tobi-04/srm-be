import { Processor, WorkerHost, InjectQueue } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Job, Queue } from "bullmq";
import {
  EmailLog,
  EmailLogDocument,
  EmailLogStatus,
} from "../entities/email-log.entity";
import {
  EmailAutomationStep,
  EmailAutomationStepDocument,
} from "../entities/email-automation-step.entity";
import { User, UserDocument } from "../../user/entities/user.entity";
import { EmailProviderService } from "../services/email-provider.service";
import {
  EmailTemplateService,
  TemplateVariables,
} from "../services/email-template.service";
import { EmailAutomationService } from "../services/email-automation.service";
import { TriggerType } from "../entities/email-automation.entity";

export interface EmailJobData {
  userId: string;
  automationId: string;
  stepId: string;
  eventData: Record<string, any>;
  broadcastKey?: string;
}

@Processor("email-automation", {
  concurrency: 5, // Process up to 5 emails concurrently
})
export class EmailAutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailAutomationProcessor.name);

  constructor(
    @InjectModel(EmailLog.name)
    private emailLogModel: Model<EmailLogDocument>,
    @InjectModel(EmailAutomationStep.name)
    private stepModel: Model<EmailAutomationStepDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private emailProvider: EmailProviderService,
    private templateService: EmailTemplateService,
    private automationService: EmailAutomationService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case "email-job":
        return this.handleEmailJob(job);
      case "broadcast-dispatcher":
        return this.handleBroadcastDispatcher(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Handle individual email sending
   */
  private async handleEmailJob(job: Job<EmailJobData>): Promise<void> {
    const { userId, automationId, stepId, eventData, broadcastKey } = job.data;
    const finalBroadcastKey = broadcastKey || "once";

    this.logger.log(
      `Processing email job ${job.id} for user ${userId}, automation ${automationId}, step ${stepId}, key ${finalBroadcastKey}`,
    );

    try {
      // Check if email already sent (duplicate prevention)
      const existingLog = await this.emailLogModel.findOne({
        user_id: new Types.ObjectId(userId),
        automation_id: new Types.ObjectId(automationId),
        step_id: new Types.ObjectId(stepId),
        broadcast_key: finalBroadcastKey,
      });

      if (existingLog && existingLog.status === EmailLogStatus.SENT) {
        this.logger.warn(
          `Email already sent for user ${userId}, automation ${automationId}, step ${stepId}. Skipping.`,
        );
        return;
      }

      // Get user details
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get step details
      const step = await this.stepModel.findById(stepId);
      if (!step) {
        throw new Error(`Step ${stepId} not found`);
      }

      // Prepare template variables
      const variables: TemplateVariables = {
        user: {
          name: user.name,
          email: user.email,
          id: userId,
        },
        ...eventData,
      };

      // Use email from variables (eventData) if provided, otherwise fallback to DB record
      const recipientEmail = (variables.user as any)?.email || user.email;

      // Render templates
      const subject = this.templateService.renderTemplate(
        step.subject_template,
        variables,
      );
      const body = this.templateService.renderTemplate(
        step.body_template,
        variables,
      );

      // Create or update email log
      const logData = {
        user_id: new Types.ObjectId(userId),
        automation_id: new Types.ObjectId(automationId),
        step_id: new Types.ObjectId(stepId),
        recipient_email: recipientEmail,
        subject,
        status: EmailLogStatus.PENDING,
        metadata: eventData,
        broadcast_key: finalBroadcastKey,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      };

      let emailLog: EmailLog;
      if (existingLog) {
        emailLog = await this.emailLogModel.findByIdAndUpdate(
          existingLog._id,
          { ...logData, status: EmailLogStatus.PENDING },
          { new: true },
        );
      } else {
        emailLog = await this.emailLogModel.create(logData);
      }

      // Send email
      await this.emailProvider.sendEmail({
        to: recipientEmail,
        subject,
        html: body,
      });

      // Update log as sent
      await this.emailLogModel.findByIdAndUpdate(emailLog._id, {
        status: EmailLogStatus.SENT,
        sent_at: new Date(),
        updated_at: new Date(),
      });

      this.logger.log(
        `Email sent successfully to ${recipientEmail} for automation ${automationId}, step ${stepId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}:`, error.stack);

      // Log failure
      try {
        await this.emailLogModel.findOneAndUpdate(
          {
            user_id: new Types.ObjectId(userId),
            automation_id: new Types.ObjectId(automationId),
            step_id: new Types.ObjectId(stepId),
            broadcast_key: finalBroadcastKey,
          },
          {
            status: EmailLogStatus.FAILED,
            error_message: error.message,
            updated_at: new Date(),
          },
          { upsert: true },
        );
      } catch (logError) {
        this.logger.error("Failed to log email error:", logError);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handle group broadcast dispatcher (find users and queue individual emails)
   */
  private async handleBroadcastDispatcher(
    job: Job<{ automationId: string }>,
  ): Promise<void> {
    const { automationId } = job.data;
    this.logger.log(`Dispatching broadcast for automation ${automationId}`);

    try {
      const automation =
        await this.automationService.getAutomationById(automationId);
      if (!automation || !automation.is_active || automation.is_deleted) {
        this.logger.warn(
          `Automation ${automationId} is inactive or deleted. Skipping broadcast.`,
        );
        return;
      }

      if (automation.trigger_type !== TriggerType.GROUP) {
        this.logger.warn(
          `Automation ${automationId} is not a GROUP type. Skipping broadcast.`,
        );
        return;
      }

      // 1. Get target users
      const userIds = await this.automationService.getTargetUserIds(
        automation.target_group,
      );
      this.logger.log(
        `Found ${userIds.length} target users for group ${automation.target_group}`,
      );

      // 2. Get steps
      const steps = await this.automationService.getSteps(automationId);
      if (steps.length === 0) {
        this.logger.warn(
          `No steps found for automation ${automationId}. Skipping broadcast.`,
        );
        return;
      }

      // 3. Queue emails for each user
      const today = new Date().toISOString().split("T")[0];

      for (const userId of userIds) {
        for (const step of steps) {
          // Calculate delay based on scheduled_at or delay_minutes
          let delayMs = 0;
          if (step.scheduled_at) {
            // If scheduled_at is set, calculate delay from now
            const scheduledTime = new Date(step.scheduled_at).getTime();
            const now = Date.now();
            delayMs = Math.max(0, scheduledTime - now);
          } else if (step.delay_minutes !== undefined) {
            // Fallback to legacy delay_minutes
            delayMs = step.delay_minutes * 60 * 1000;
          }

          await this.emailQueue.add(
            "email-job",
            {
              userId,
              automationId: automation._id.toString(),
              stepId: step._id.toString(),
              broadcastKey: today,
              eventData: {
                broadcastDate: new Date(),
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
      }

      this.logger.log(
        `Broadcast dispatch completed for ${userIds.length} users.`,
      );
    } catch (error) {
      this.logger.error(
        `Broadcast dispatcher failed for ${automationId}:`,
        error.stack,
      );
      throw error;
    }
  }
}
