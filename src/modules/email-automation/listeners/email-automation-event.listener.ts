import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EventType } from "../entities/email-automation.entity";
import { EmailAutomationService } from "../services/email-automation.service";
import { EmailJobData } from "../processors/email-automation.processor";

// Event payload interfaces
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  registeredAt: Date;
}

export interface CoursePurchasedEvent {
  userId: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  purchasedAt: Date;
  tempPassword?: string;
  isNewUser: boolean;
  email: string;
  name: string;
}

export interface UserRegisteredNoPurchaseEvent {
  userId: string;
  email: string;
  name: string;
  registeredAt: Date;
  daysSinceRegistration: number;
}

@Injectable()
export class EmailAutomationEventListener {
  private readonly logger = new Logger(EmailAutomationEventListener.name);

  constructor(
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private automationService: EmailAutomationService
  ) {}

  /**
   * Handle user registered event
   */
  @OnEvent("user.registered")
  async handleUserRegistered(payload: UserRegisteredEvent) {
    this.logger.log(`User registered event received: ${payload.userId}`);
    await this.processEvent(EventType.USER_REGISTERED, payload);
  }

  /**
   * Handle course purchased event
   */
  @OnEvent("course.purchased")
  async handleCoursePurchased(payload: CoursePurchasedEvent) {
    this.logger.log(
      `Course purchased event received: user ${payload.userId}, course ${payload.courseId}`
    );
    await this.processEvent(EventType.COURSE_PURCHASED, {
      ...payload,
      user: {
        name: payload.name,
        email: payload.email,
        id: payload.userId,
      },
      course: {
        title: payload.courseTitle,
        id: payload.courseId,
      },
      order: {
        amount: payload.amount,
      },
      temp_password: payload.tempPassword,
      is_new_user: payload.isNewUser,
      submission_id: (payload as any).submissionId,
    });
  }

  /**
   * Handle user registered but not purchased event
   */
  @OnEvent("user.registered.no.purchase")
  async handleUserRegisteredNoPurchase(payload: UserRegisteredNoPurchaseEvent) {
    this.logger.log(
      `User registered but not purchased event received: ${payload.userId}`
    );
    await this.processEvent(
      EventType.USER_REGISTERED_BUT_NOT_PURCHASED,
      payload
    );
  }

  /**
   * Process event and create email jobs
   */
  private async processEvent(eventType: EventType, eventData: any) {
    try {
      // Find active automations for this event type
      const automations =
        await this.automationService.getActiveAutomationsByEvent(eventType);

      if (automations.length === 0) {
        this.logger.log(`No active automations found for event ${eventType}`);
        return;
      }

      this.logger.log(
        `Found ${automations.length} active automation(s) for event ${eventType}`
      );

      // For each automation, create jobs for all steps
      for (const automation of automations) {
        const steps = await this.automationService.getSteps(
          automation._id.toString()
        );

        this.logger.log(
          `Creating ${steps.length} email job(s) for automation ${automation.name}`
        );

        for (const step of steps) {
          const jobData: EmailJobData = {
            userId: eventData.userId,
            automationId: automation._id.toString(),
            stepId: step._id.toString(),
            eventData,
          };

          // Add job to queue with delay
          await this.emailQueue.add(`email-job`, jobData, {
            delay: step.delay_minutes * 60 * 1000, // Convert minutes to milliseconds
            attempts: 3, // Retry up to 3 times
            backoff: {
              type: "exponential",
              delay: 60000, // Start with 1 minute delay
            },
            removeOnComplete: {
              age: 86400, // Keep completed jobs for 24 hours
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              age: 604800, // Keep failed jobs for 7 days
            },
          });

          this.logger.log(
            `Email job queued for automation ${automation.name}, step ${step.step_order}, delay ${step.delay_minutes} minutes`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process event ${eventType}:`, error.stack);
    }
  }
}
