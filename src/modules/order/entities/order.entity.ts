import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUND = "refund",
}

@Schema({ collection: "orders", timestamps: false })
export class Order extends BaseEntity {
  // Reference to Saler (User) - nullable nếu không có saler
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: false,
  })
  saler_id?: string;

  // Reference to Course
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Course",
    required: true,
  })
  course_id: string;

  // Reference to UserFormSubmission
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "UserFormSubmission",
    required: true,
  })
  user_submission_id: string;

  // Reference to Payment (optional)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Payment",
    required: false,
  })
  payment_id?: string;

  // Amount of the order
  @Prop({ required: true, min: 0 })
  amount: number;

  // Order status
  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  // Paid timestamp
  @Prop({ type: Date, required: false })
  paid_at?: Date;

  // Refunded timestamp
  @Prop({ type: Date, required: false })
  refunded_at?: Date;

  // Additional metadata
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes for efficient querying
OrderSchema.index({ saler_id: 1, status: 1, created_at: -1 });
OrderSchema.index({ user_submission_id: 1 });
OrderSchema.index({ course_id: 1 });
OrderSchema.index({ payment_id: 1 });
OrderSchema.index({ status: 1, created_at: -1 });
OrderSchema.index({ is_deleted: 1 });
