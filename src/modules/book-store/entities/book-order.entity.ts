import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum BookOrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

@Schema({ collection: "book_orders", timestamps: false })
export class BookOrder extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  transfer_code: string;

  @Prop({ required: true, min: 0 })
  total_amount: number;

  @Prop({
    type: String,
    enum: BookOrderStatus,
    default: BookOrderStatus.PENDING,
  })
  status: BookOrderStatus;

  @Prop()
  qr_code_url?: string;

  @Prop()
  sepay_transaction_id?: string;

  @Prop({ type: Date })
  paid_at?: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export type BookOrderDocument = HydratedDocument<BookOrder>;
export const BookOrderSchema = SchemaFactory.createForClass(BookOrder);

// Add indexes
BookOrderSchema.index({ user_id: 1 });
BookOrderSchema.index({ transfer_code: 1 }, { unique: true });
BookOrderSchema.index({ status: 1 });
BookOrderSchema.index({ created_at: -1 });
