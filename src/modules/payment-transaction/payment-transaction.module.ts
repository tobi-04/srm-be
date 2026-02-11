import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PaymentTransactionService } from "./payment-transaction.service";
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from "./entities/payment-transaction.entity";
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from "../course-enrollment/entities/course-enrollment.entity";
import {
  UserFormSubmission,
  UserFormSubmissionSchema,
} from "../landing-page/entities/user-form-submission.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
      { name: UserFormSubmission.name, schema: UserFormSubmissionSchema },
    ]),
  ],
  providers: [PaymentTransactionService],
  exports: [PaymentTransactionService],
})
export class PaymentTransactionModule {}
