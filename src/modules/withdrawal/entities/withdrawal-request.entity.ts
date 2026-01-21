import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum WithdrawalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

export interface WithdrawalBankInfo {
  account_holder: string;
  account_number: string;
  bank_code: string;
  bank_name: string;
}

@Schema({ collection: "withdrawal_requests", timestamps: false })
export class WithdrawalRequest extends BaseEntity {
  // Reference to User (saler)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
  })
  user_id: string;

  // Requested amount (before fee)
  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  // Fee calculated at request time
  @Prop({ type: Number, required: true, min: 0 })
  fee_amount: number;

  // Net amount after fee deduction
  @Prop({ type: Number, required: true, min: 0 })
  net_amount: number;

  // Fee rate at time of request (percentage 0-100)
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  fee_rate: number;

  // Status of withdrawal request
  @Prop({
    type: String,
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  // Snapshot of saler's bank account at request time
  @Prop({
    type: {
      account_holder: { type: String },
      account_number: { type: String },
      bank_code: { type: String },
      bank_name: { type: String },
    },
    required: true,
  })
  bank_account: WithdrawalBankInfo;

  // Reason if rejected
  @Prop({ type: String, default: null })
  reject_reason: string | null;

  // Admin who processed this request
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    default: null,
  })
  processed_by: string | null;

  // When the request was processed
  @Prop({ type: Date, default: null })
  processed_at: Date | null;
}

export type WithdrawalRequestDocument = HydratedDocument<WithdrawalRequest>;
export const WithdrawalRequestSchema =
  SchemaFactory.createForClass(WithdrawalRequest);

// Indexes
WithdrawalRequestSchema.index({ user_id: 1 });
WithdrawalRequestSchema.index({ status: 1 });
WithdrawalRequestSchema.index({ created_at: -1 });
WithdrawalRequestSchema.index({ is_deleted: 1 });
