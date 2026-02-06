import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CouponController } from "./coupon.controller";
import { Coupon, CouponSchema } from "../book-store/entities/coupon.entity";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
  ],
  controllers: [CouponController],
  exports: [MongooseModule],
})
export class CouponModule {}
