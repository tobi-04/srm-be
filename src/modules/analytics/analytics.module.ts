import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from "../payment-transaction/entities/payment-transaction.entity";
import { User, UserSchema } from "../user/entities/user.entity";
import { Lesson, LessonSchema } from "../lesson/entities/lesson.entity";
import {
  LessonProgress,
  LessonProgressSchema,
} from "../lesson/entities/lesson-progress.entity";
import {
  TrafficSource,
  TrafficSourceSchema,
} from "../traffic-source/entities/traffic-source.entity";
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from "../course-enrollment/entities/course-enrollment.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: LessonProgress.name, schema: LessonProgressSchema },
      { name: TrafficSource.name, schema: TrafficSourceSchema },
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
