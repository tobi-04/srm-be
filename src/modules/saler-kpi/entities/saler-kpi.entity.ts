import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "saler_kpis", timestamps: false })
export class SalerKPI extends BaseEntity {
  // Reference to Saler (User)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
  })
  saler_id: string;

  // Period in format "YYYY-MM"
  @Prop({ required: true })
  period: string;

  // Target revenue for this period
  @Prop({ type: Number, default: 0, min: 0 })
  target_revenue: number;

  // Actual revenue achieved
  @Prop({ type: Number, default: 0, min: 0 })
  actual_revenue: number;

  // Total number of orders in this period
  @Prop({ type: Number, default: 0, min: 0 })
  total_orders: number;

  // Completion percentage (actual_revenue / target_revenue * 100)
  @Prop({ type: Number, default: 0, min: 0 })
  completion_percentage: number;
}

export type SalerKPIDocument = HydratedDocument<SalerKPI>;
export const SalerKPISchema = SchemaFactory.createForClass(SalerKPI);

// Indexes for efficient querying
SalerKPISchema.index({ saler_id: 1, period: 1 }, { unique: true });
SalerKPISchema.index({ is_deleted: 1 });
