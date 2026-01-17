import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  EXPIRED = "expired",
}

@Schema({ collection: "payments", timestamps: false })
export class Payment extends BaseEntity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "UserFormSubmission",
    required: true,
  })
  user_submission_id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "LandingPage",
    required: true,
  })
  landing_page_id: string;

  @Prop({ required: true })
  course_price: number;

  @Prop({ required: true })
  fee: number;

  @Prop({ required: true })
  total_amount: number;

  @Prop({ required: false })
  qr_code_url?: string;

  @Prop({ required: true })
  bank_account: string;

  @Prop({ required: true })
  bank_code: string;

  @Prop({ required: true, unique: true })
  transfer_content: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: Date, required: false })
  paid_at?: Date;

  @Prop({ required: false })
  sepay_transaction_id?: string;

  @Prop({ type: Date, required: false })
  expires_at?: Date;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type PaymentDocument = Payment & Document;
export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes for efficient querying
PaymentSchema.index({ user_submission_id: 1 });
PaymentSchema.index({ landing_page_id: 1 });
PaymentSchema.index({ transfer_content: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ created_at: -1 });
PaymentSchema.index({ is_deleted: 1 });
