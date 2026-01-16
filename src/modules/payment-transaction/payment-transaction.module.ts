import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PaymentTransactionService } from "./payment-transaction.service";
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from "./entities/payment-transaction.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
  ],
  providers: [PaymentTransactionService],
  exports: [PaymentTransactionService],
})
export class PaymentTransactionModule {}
