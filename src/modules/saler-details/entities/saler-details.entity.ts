import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export interface CourseCommission {
  course_id: string;
  commission_rate: number; // 0-100 percentage
}

@Schema({ collection: "saler_details", timestamps: false })
export class SalerDetails extends BaseEntity {
  // Reference to User (saler)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  })
  user_id: string;

  // Unique affiliate code (format: AFF{timestamp})
  @Prop({ required: true, unique: true })
  code_saler: string;

  // KPI Targets
  @Prop({ type: Number, default: 0, min: 0 })
  kpi_monthly_target: number;

  @Prop({ type: Number, default: 0, min: 0 })
  kpi_quarterly_target: number;

  @Prop({ type: Number, default: 0, min: 0 })
  kpi_yearly_target: number;

  // Assigned courses
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: "Course" }],
    default: [],
  })
  assigned_courses: string[];

  // Commission rates per course
  @Prop({
    type: [
      {
        course_id: { type: MongooseSchema.Types.ObjectId, ref: "Course" },
        commission_rate: { type: Number, min: 0, max: 100 },
      },
    ],
    default: [],
  })
  course_commissions: CourseCommission[];

  // Default commission for unspecified courses
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  default_commission_rate: number;
}

export type SalerDetailsDocument = HydratedDocument<SalerDetails>;
export const SalerDetailsSchema = SchemaFactory.createForClass(SalerDetails);

// Add indexes
SalerDetailsSchema.index({ user_id: 1 }, { unique: true });
SalerDetailsSchema.index({ code_saler: 1 }, { unique: true });
SalerDetailsSchema.index({ is_deleted: 1 });
