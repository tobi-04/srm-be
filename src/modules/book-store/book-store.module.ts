import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Book, BookSchema } from "./entities/book.entity";
import { BookFile, BookFileSchema } from "./entities/book-file.entity";
import { BookOrder, BookOrderSchema } from "./entities/book-order.entity";
import {
  BookOrderItem,
  BookOrderItemSchema,
} from "./entities/book-order-item.entity";
import {
  UserBookAccess,
  UserBookAccessSchema,
} from "./entities/user-book-access.entity";
import { Coupon, CouponSchema } from "./entities/coupon.entity";
import { BookStoreController } from "./book-store.controller";
import { AdminBookController } from "./admin-book.controller";
import { CouponAdminController } from "./coupon-admin.controller";
import { BookStoreService } from "./book-store.service";
import { BookStoreRepository } from "./book-store.repository";
import { BookOrderService } from "./book-order.service";

import { RedisCacheModule } from "../../common/cache/redis-cache.module";
import { UserModule } from "../user/user.module";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      { name: BookFile.name, schema: BookFileSchema },
      { name: BookOrder.name, schema: BookOrderSchema },
      { name: BookOrderItem.name, schema: BookOrderItemSchema },
      { name: UserBookAccess.name, schema: UserBookAccessSchema },
      { name: Coupon.name, schema: CouponSchema },
    ]),
    RedisCacheModule,
    forwardRef(() => UserModule),
    PaymentModule,
  ],
  controllers: [
    CouponAdminController,
    AdminBookController,
    BookStoreController,
  ],
  providers: [BookStoreService, BookStoreRepository, BookOrderService],
  exports: [BookStoreService, BookStoreRepository, BookOrderService],
})
export class BookStoreModule {}
