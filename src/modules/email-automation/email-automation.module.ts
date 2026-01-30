import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import {
  EmailAutomation,
  EmailAutomationSchema,
} from "./entities/email-automation.entity";
import {
  EmailAutomationStep,
  EmailAutomationStepSchema,
} from "./entities/email-automation-step.entity";
import { EmailLog, EmailLogSchema } from "./entities/email-log.entity";
import { User, UserSchema } from "../user/entities/user.entity";
import { Payment, PaymentSchema } from "../payment/entities/payment.entity";
import {
  UserFormSubmission,
  UserFormSubmissionSchema,
} from "../landing-page/entities/user-form-submission.entity";
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from "../course-enrollment/entities/course-enrollment.entity";
import {
  TrafficSource,
  TrafficSourceSchema,
} from "../traffic-source/entities/traffic-source.entity";
import { EmailProviderService } from "./services/email-provider.service";
import { EmailTemplateService } from "./services/email-template.service";
import { EmailAutomationService } from "./services/email-automation.service";
import { EmailSchedulerService } from "./services/email-scheduler.service";
import { EmailAutomationController } from "./email-automation.controller";
import { EmailAutomationProcessor } from "./processors/email-automation.processor";
import { EmailAutomationEventListener } from "./listeners/email-automation-event.listener";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailAutomation.name, schema: EmailAutomationSchema },
      { name: EmailAutomationStep.name, schema: EmailAutomationStepSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: UserFormSubmission.name, schema: UserFormSubmissionSchema },
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
      { name: TrafficSource.name, schema: TrafficSourceSchema },
    ]),
    BullModule.registerQueue({
      name: "email-automation",
    }),
  ],
  controllers: [EmailAutomationController],
  providers: [
    EmailProviderService,
    EmailTemplateService,
    EmailAutomationService,
    EmailSchedulerService,
    EmailAutomationProcessor,
    EmailAutomationEventListener,
  ],
  exports: [EmailAutomationService, EmailTemplateService],
})
export class EmailAutomationModule {}
