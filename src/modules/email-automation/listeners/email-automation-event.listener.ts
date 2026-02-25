import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
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
  submissionId?: string;
}

export interface UserRegisteredNoPurchaseEvent {
  userId: string;
  email: string;
  name: string;
  registeredAt: Date;
  daysSinceRegistration: number;
}

export interface BookPurchasedEvent {
  userId: string;
  orderId: string;
  email: string;
  name: string;
  amount: number;
  books: { id: string; title: string; files?: { fileId: string; fileName: string; filePath: string; fileType: string }[] }[];
  purchasedAt: Date;
}

export interface IndicatorSubscribedEvent {
  userId: string;
  subscriptionId: string;
  userEmail: string;
  userName: string;
  indicatorId: string;
  indicatorName: string;
  amount: number;
  startAt: Date;
  endAt: Date;
  isNewUser: boolean;
}

@Injectable()
export class EmailAutomationEventListener {
  private readonly logger = new Logger(EmailAutomationEventListener.name);

  constructor(
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private automationService: EmailAutomationService,
    private configService: ConfigService,
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
      `Course purchased event received: user ${payload.userId}, course ${payload.courseId}`,
    );
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173";
    const learningUrl = `${frontendUrl}/learn/${payload.courseId}`;

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
        learning_url: learningUrl,
      },
      order: {
        amount: payload.amount,
      },
      temp_password: payload.tempPassword,
      is_new_user: payload.isNewUser,
      // Keep submissionId at top level so processEvent can use it as the per-purchase unique key
      submissionId: payload.submissionId,
    });
  }

  /**
   * Handle user registered but not purchased event
   */
  @OnEvent("user.registered.no.purchase")
  async handleUserRegisteredNoPurchase(payload: UserRegisteredNoPurchaseEvent) {
    this.logger.log(
      `User registered but not purchased event received: ${payload.userId}`,
    );
    await this.processEvent(
      EventType.USER_REGISTERED_BUT_NOT_PURCHASED,
      payload,
    );

    // Also trigger specific book/indicator non-purchase events for new registrations
    if (payload.daysSinceRegistration === 0) {
      await this.processEvent(EventType.USER_REGISTERED_BUT_NOT_PURCHASED_BOOK, {
        ...payload,
      });
      await this.processEvent(
        EventType.USER_REGISTERED_BUT_NOT_PURCHASED_INDICATOR,
        { ...payload },
      );
    }
  }

  /**
   * Handle book purchased event
   */
  @OnEvent("book.purchased")
  async handleBookPurchased(payload: BookPurchasedEvent) {
    this.logger.log(
      `Book purchased event received: user ${payload.userId}, order ${payload.orderId}`,
    );
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:5173";
    const myBooksUrl = `${frontendUrl}/student/my-books`;

    await this.processEvent(EventType.BOOK_PURCHASED, {
      ...payload,
      user: {
        name: payload.name,
        email: payload.email,
        id: payload.userId,
      },
      book: {
        title: payload.books[0]?.title,
        id: payload.books[0]?.id,
        my_books_url: myBooksUrl,
        files: payload.books[0]?.files || [],
      },
      books: payload.books,
      order: {
        amount: payload.amount,
        id: payload.orderId,
      },
    });
  }

  /**
   * Handle indicator subscribed event
   */
  @OnEvent("indicator.subscribed")
  async handleIndicatorSubscribed(payload: IndicatorSubscribedEvent) {
    this.logger.log(
      `Indicator subscribed event received: user ${payload.userId}, sub ${payload.subscriptionId}`,
    );
    await this.processEvent(EventType.INDICATOR_PURCHASED, {
      ...payload,
      user: {
        name: payload.userName,
        email: payload.userEmail,
        id: payload.userId,
      },
      indicator: {
        name: payload.indicatorName,
        id: payload.indicatorId,
      },
      subscription: {
        amount: payload.amount,
        id: payload.subscriptionId,
        start_at: payload.startAt,
        end_at: payload.endAt,
      },
    });
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
        `Found ${automations.length} active automation(s) for event ${eventType}`,
      );

      // For each automation, create jobs for all steps
      for (const automation of automations) {
        // Filter by specific product if defined in automation
        if (automation.product_id) {
          let matchesProduct = false;
          const pid = automation.product_id.toString();

          if (eventType === EventType.COURSE_PURCHASED) {
            matchesProduct = eventData.courseId?.toString() === pid;
          } else if (eventType === EventType.BOOK_PURCHASED) {
            // Check if any of the books match the product_id
            matchesProduct = eventData.books?.some(
              (b: any) => b.id?.toString() === pid,
            );
          } else if (eventType === EventType.INDICATOR_PURCHASED) {
            matchesProduct = eventData.indicatorId?.toString() === pid;
          }

          if (!matchesProduct) {
            this.logger.debug(
              `Skipping automation ${automation.name} - product ID mismatch. Expected ${pid}`,
            );
            continue;
          }
        }

        const steps = await this.automationService.getSteps(
          automation._id.toString(),
        );

        this.logger.log(
          `Creating ${steps.length} email job(s) for automation ${automation.name}`,
        );

        for (const step of steps) {
          // Derive a unique key per transaction so duplicate-check is per-purchase,
          // not per-user lifetime.  Broadcast GROUP jobs pass their own broadcastKey (date).
          const transactionKey =
            eventData.orderId ||          // BOOK_PURCHASED / COURSE_PURCHASED
            eventData.submissionId ||     // legacy course flow
            eventData.subscriptionId ||   // INDICATOR_PURCHASED
            undefined;                    // fallback → processor will use "once" (GROUP broadcasts)

          const jobData: EmailJobData = {
            userId: eventData.userId,
            automationId: automation._id.toString(),
            stepId: step._id.toString(),
            eventData,
            ...(transactionKey ? { broadcastKey: transactionKey } : {}),
          };

          // Calculate delay based on scheduled_at, delay_days or delay_minutes
          let delayMs = 0;
          if (step.scheduled_at) {
            // If scheduled_at is set, calculate delay from now
            const scheduledTime = new Date(step.scheduled_at).getTime();
            const now = Date.now();
            delayMs = Math.max(0, scheduledTime - now);
          } else if (step.delay_days !== undefined && step.delay_days > 0) {
            // New logic: Delay relative to event time (now) in days
            delayMs = step.delay_days * 24 * 60 * 60 * 1000;
          } else if (step.delay_minutes !== undefined) {
            // Fallback to legacy delay_minutes
            delayMs = step.delay_minutes * 60 * 1000;
          }

          // Add job to queue with delay
          await this.emailQueue.add(`email-job`, jobData, {
            delay: delayMs,
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
            `Email job queued for automation ${automation.name}, step ${step.step_order}, ` +
              (step.scheduled_at
                ? `scheduled at ${step.scheduled_at}`
                : `delay ${step.delay_minutes} minutes`),
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process event ${eventType}:`, error.stack);
    }
  }
}
