import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

/**
 * IndicatorSubscription Entity - Quản lý việc thuê Indicator
 * Mỗi subscription đại diện cho việc một user thuê một indicator
 */
@Schema({ collection: "indicator_subscriptions", timestamps: false })
export class IndicatorSubscription extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Indicator", required: true })
  indicator_id: Types.ObjectId;

  /**
   * Ngày bắt đầu subscription
   */
  @Prop({ type: Date })
  start_at?: Date;

  /**
   * Ngày hết hạn subscription
   */
  @Prop({ type: Date })
  end_at?: Date;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  /**
   * Tự động gia hạn khi hết hạn
   */
  @Prop({ default: false })
  auto_renew: boolean;

  /**
   * Transfer code cho thanh toán (giống book order)
   */
  @Prop({ required: true })
  transfer_code: string;

  /**
   * QR code URL từ SePay
   */
  @Prop()
  qr_code_url?: string;

  /**
   * Metadata bổ sung
   */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export type IndicatorSubscriptionDocument =
  HydratedDocument<IndicatorSubscription>;
export const IndicatorSubscriptionSchema = SchemaFactory.createForClass(
  IndicatorSubscription,
);

// Add indexes
IndicatorSubscriptionSchema.index({ user_id: 1 });
IndicatorSubscriptionSchema.index({ indicator_id: 1 });
IndicatorSubscriptionSchema.index({ user_id: 1, indicator_id: 1 });
IndicatorSubscriptionSchema.index({ status: 1 });
IndicatorSubscriptionSchema.index({ end_at: 1 });
IndicatorSubscriptionSchema.index({ transfer_code: 1 }, { unique: true });
