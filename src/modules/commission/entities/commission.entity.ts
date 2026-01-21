import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum CommissionStatus {
  PENDING = "pending",
  AVAILABLE = "available",
  PAID = "paid",
}

@Schema({ collection: "commissions", timestamps: false })
export class Commission extends BaseEntity {
  // Reference to Saler (User)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
  })
  saler_id: string;

  // Reference to Order
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Order",
    required: true,
  })
  order_id: string;

  // Reference to Course
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Course",
    required: true,
  })
  course_id: string;

  // Order amount snapshot
  @Prop({ required: true, min: 0 })
  order_amount: number;

  // Commission rate snapshot (0-100 percentage)
  @Prop({ required: true, min: 0, max: 100 })
  commission_rate: number;

  // Calculated commission amount = order_amount * commission_rate / 100
  @Prop({ required: true, min: 0 })
  commission_amount: number;

  // Commission status
  @Prop({
    type: String,
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status: CommissionStatus;

  // Paid timestamp
  @Prop({ type: Date, required: false })
  paid_at?: Date;

  // Additional metadata
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type CommissionDocument = HydratedDocument<Commission>;
export const CommissionSchema = SchemaFactory.createForClass(Commission);

// Indexes for efficient querying
CommissionSchema.index({ saler_id: 1, status: 1 });
CommissionSchema.index({ order_id: 1 }, { unique: true });
CommissionSchema.index({ course_id: 1 });
CommissionSchema.index({ is_deleted: 1 });
