import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "@nestjs/config";
import { PaymentController } from "./payment.controller";
import { PaymentWebhookController } from "./payment-webhook.controller";
import { PaymentService } from "./payment.service";
import { SePayService } from "./sepay.service";
import { Payment, PaymentSchema } from "./entities/payment.entity";
import { PaymentTransactionModule } from "../payment-transaction/payment-transaction.module";
import { CourseEnrollmentModule } from "../course-enrollment/course-enrollment.module";
import { UserModule } from "../user/user.module";
import { LandingPageModule } from "../landing-page/landing-page.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    ConfigModule,
    PaymentTransactionModule,
    CourseEnrollmentModule,
    UserModule,
    LandingPageModule,
  ],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [PaymentService, SePayService],
  exports: [PaymentService, SePayService],
})
export class PaymentModule {}
