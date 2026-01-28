import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Indicator, IndicatorSchema } from "./entities/indicator.entity";
import {
  IndicatorSubscription,
  IndicatorSubscriptionSchema,
} from "./entities/indicator-subscription.entity";
import {
  IndicatorPayment,
  IndicatorPaymentSchema,
} from "./entities/indicator-payment.entity";
import { IndicatorStoreController } from "./indicator-store.controller";
import { AdminIndicatorController } from "./admin-indicator.controller";
import { IndicatorStoreService } from "./indicator-store.service";
import { IndicatorRepository } from "./indicator.repository";
import { SubscriptionService } from "./subscription.service";

import { RedisCacheModule } from "../../common/cache/redis-cache.module";
import { UserModule } from "../user/user.module";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Indicator.name, schema: IndicatorSchema },
      { name: IndicatorSubscription.name, schema: IndicatorSubscriptionSchema },
      { name: IndicatorPayment.name, schema: IndicatorPaymentSchema },
    ]),
    RedisCacheModule,
    forwardRef(() => UserModule),
    PaymentModule,
  ],
  controllers: [AdminIndicatorController, IndicatorStoreController],
  providers: [IndicatorStoreService, IndicatorRepository, SubscriptionService],
  exports: [IndicatorStoreService, IndicatorRepository, SubscriptionService],
})
export class IndicatorStoreModule {}
