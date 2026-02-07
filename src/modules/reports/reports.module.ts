import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Order, OrderSchema } from '../order/entities/order.entity';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from '../payment-transaction/entities/payment-transaction.entity';
import {
  BookOrder,
  BookOrderSchema,
} from '../book-store/entities/book-order.entity';
import {
  BookOrderItem,
  BookOrderItemSchema,
} from '../book-store/entities/book-order-item.entity';
import {
  IndicatorPayment,
  IndicatorPaymentSchema,
} from '../indicator-store/entities/indicator-payment.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { Course, CourseSchema } from '../course/entities/course.entity';
import { Book, BookSchema } from '../book-store/entities/book.entity';
import {
  Indicator,
  IndicatorSchema,
} from '../indicator-store/entities/indicator.entity';
import {
  IndicatorSubscription,
  IndicatorSubscriptionSchema,
} from '../indicator-store/entities/indicator-subscription.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: BookOrder.name, schema: BookOrderSchema },
      { name: BookOrderItem.name, schema: BookOrderItemSchema },
      { name: IndicatorPayment.name, schema: IndicatorPaymentSchema },
      { name: IndicatorSubscription.name, schema: IndicatorSubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Book.name, schema: BookSchema },
      { name: Indicator.name, schema: IndicatorSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
