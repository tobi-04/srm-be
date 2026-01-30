import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

/**
 * IndicatorPayment Entity - Lịch sử thanh toán subscription
 * Mỗi lần thanh toán (bao gồm gia hạn) sẽ tạo một payment record
 */
@Schema({ collection: "indicator_payments", timestamps: false })
export class IndicatorPayment extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "IndicatorSubscription", required: true })
  subscription_id: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  /**
   * Thời gian bắt đầu của chu kỳ thanh toán này
   */
  @Prop({ type: Date, required: true })
  period_start: Date;

  /**
   * Thời gian kết thúc của chu kỳ thanh toán này
   */
  @Prop({ type: Date, required: true })
  period_end: Date;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Prop({ type: Date })
  paid_at?: Date;

  /**
   * ID giao dịch từ SePay
   */
  @Prop()
  sepay_transaction_id?: string;
}

export type IndicatorPaymentDocument = HydratedDocument<IndicatorPayment>;
export const IndicatorPaymentSchema =
  SchemaFactory.createForClass(IndicatorPayment);

// Add indexes
IndicatorPaymentSchema.index({ subscription_id: 1 });
IndicatorPaymentSchema.index({ status: 1 });
IndicatorPaymentSchema.index({ paid_at: -1 });
