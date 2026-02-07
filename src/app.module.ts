import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisCacheModule } from "./common/cache/redis-cache.module";
import { R2Module } from "./common/storage/r2.module";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditLogModule } from "./modules/audit-log/audit-log.module";
import { CourseModule } from "./modules/course/course.module";
import { LessonModule } from "./modules/lesson/lesson.module";
import { LandingPageModule } from "./modules/landing-page/landing-page.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PaymentTransactionModule } from "./modules/payment-transaction/payment-transaction.module";
import { CourseEnrollmentModule } from "./modules/course-enrollment/course-enrollment.module";
import { EmailAutomationModule } from "./modules/email-automation/email-automation.module";
import { TrafficSourceModule } from "./modules/traffic-source/traffic-source.module";
import { SessionModule } from "./modules/session/session.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { StudentModule } from "./modules/student/student.module";
import { SalerDetailsModule } from "./modules/saler-details/saler-details.module";
import { OrderModule } from "./modules/order/order.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { SalerKPIModule } from "./modules/saler-kpi/saler-kpi.module";
import { SalerModule } from "./modules/saler/saler.module";
import { WithdrawalModule } from "./modules/withdrawal/withdrawal.module";
import { ApiLoggerMiddleware } from "./common/middleware/api-logger.middleware";
import { BookStoreModule } from "./modules/book-store/book-store.module";
import { IndicatorStoreModule } from "./modules/indicator-store/indicator-store.module";
import { UploadModule } from "./modules/upload/upload.module";
import { CouponModule } from "./modules/coupon/coupon.module";
import { TelegramModule } from "./modules/telegram/telegram.module";
import { ReportsModule } from "./modules/reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017/srm-lesson",
    ),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    RedisCacheModule,
    R2Module,
    UserModule,
    AuthModule,
    AuditLogModule,
    CourseModule,
    LessonModule,
    LandingPageModule,
    PaymentModule,
    PaymentTransactionModule,
    CourseEnrollmentModule,
    EmailAutomationModule,
    TrafficSourceModule,
    SessionModule,
    AnalyticsModule,
    StudentModule,
    SalerDetailsModule,
    OrderModule,
    CommissionModule,
    SalerKPIModule,
    SalerModule,
    WithdrawalModule,
    BookStoreModule,
    IndicatorStoreModule,
    UploadModule,
    CouponModule,
    TelegramModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiLoggerMiddleware).forRoutes("*"); // Apply to all routes
  }
}
