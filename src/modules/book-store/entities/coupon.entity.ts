import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum CouponType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

export enum ApplicableResourceType {
  BOOK = "BOOK",
  COURSE = "COURSE",
  INDICATOR = "INDICATOR",
  ALL = "ALL",
}

@Schema({ collection: "coupons", timestamps: true })
export class Coupon extends BaseEntity {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, enum: CouponType, default: CouponType.PERCENTAGE })
  type: CouponType;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({
    type: [String],
    enum: Object.values(ApplicableResourceType),
    default: [ApplicableResourceType.ALL],
  })
  applicable_to: ApplicableResourceType[];

  @Prop({ default: null })
  expires_at: Date;

  @Prop({ default: 0 })
  usage_limit: number;

  @Prop({ default: 0 })
  usage_count: number;

  @Prop({ default: true })
  is_active: boolean;
}

export type CouponDocument = HydratedDocument<Coupon>;
export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Add index
CouponSchema.index({ code: 1 }, { unique: true });
