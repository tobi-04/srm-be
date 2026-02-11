import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";
import { Course, CourseSchema } from "../course/entities/course.entity";
import { Lesson, LessonSchema } from "../lesson/entities/lesson.entity";
import { User, UserSchema } from "../user/entities/user.entity";
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from "../payment-transaction/entities/payment-transaction.entity";
import {
  LessonProgress,
  LessonProgressSchema,
} from "../lesson/entities/lesson-progress.entity";
import {
  UserFormSubmission,
  UserFormSubmissionSchema,
} from "../landing-page/entities/user-form-submission.entity";
import {
  BookOrder,
  BookOrderSchema,
} from "../book-store/entities/book-order.entity";
import {
  BookOrderItem,
  BookOrderItemSchema,
} from "../book-store/entities/book-order-item.entity";
import {
  IndicatorSubscription,
  IndicatorSubscriptionSchema,
} from "../indicator-store/entities/indicator-subscription.entity";
import { Book, BookSchema } from "../book-store/entities/book.entity";
import {
  Indicator,
  IndicatorSchema,
} from "../indicator-store/entities/indicator.entity";
import { CourseEnrollmentModule } from "../course-enrollment/course-enrollment.module";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: User.name, schema: UserSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: LessonProgress.name, schema: LessonProgressSchema },
      { name: UserFormSubmission.name, schema: UserFormSubmissionSchema },
      { name: BookOrder.name, schema: BookOrderSchema },
      { name: BookOrderItem.name, schema: BookOrderItemSchema },
      { name: IndicatorSubscription.name, schema: IndicatorSubscriptionSchema },
      { name: Book.name, schema: BookSchema },
      { name: Indicator.name, schema: IndicatorSchema },
    ]),
    CourseEnrollmentModule,
    RedisCacheModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
