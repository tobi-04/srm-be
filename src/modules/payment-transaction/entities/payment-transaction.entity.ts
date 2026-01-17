import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum PaymentTransactionStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Schema({ collection: "payment_transactions", timestamps: false })
export class PaymentTransaction extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Course", required: true })
  course_id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "UserFormSubmission",
    required: true,
  })
  user_form_submission_id: string;

  @Prop({ required: true, unique: true })
  transfer_code: string; // Format: ZLP{_id}

  @Prop({ required: true })
  amount: number;

  @Prop({
    type: String,
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status: PaymentTransactionStatus;

  @Prop()
  sepay_transaction_id?: string;

  @Prop({ type: Date })
  paid_at?: Date;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;
export const PaymentTransactionSchema =
  SchemaFactory.createForClass(PaymentTransaction);

// Indexes for efficient querying
PaymentTransactionSchema.index({ transfer_code: 1 }, { unique: true });
PaymentTransactionSchema.index({ user_form_submission_id: 1 });
PaymentTransactionSchema.index({ course_id: 1 });
PaymentTransactionSchema.index({ status: 1 });
PaymentTransactionSchema.index({ created_at: -1 });
PaymentTransactionSchema.index({ is_deleted: 1 });
