import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum EnrollmentStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  COMPLETED = "completed",
}

@Schema({ collection: "course_enrollments", timestamps: false })
export class CourseEnrollment extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  user_id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Course", required: true })
  course_id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "PaymentTransaction",
    required: true,
  })
  payment_transaction_id: string;

  @Prop({ type: Date, default: Date.now })
  enrolled_at: Date;

  @Prop({
    type: String,
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type CourseEnrollmentDocument = HydratedDocument<CourseEnrollment>;
export const CourseEnrollmentSchema =
  SchemaFactory.createForClass(CourseEnrollment);

// Indexes for efficient querying
CourseEnrollmentSchema.index({ user_id: 1, course_id: 1 }, { unique: true });
CourseEnrollmentSchema.index({ payment_transaction_id: 1 });
CourseEnrollmentSchema.index({ course_id: 1 });
CourseEnrollmentSchema.index({ status: 1 });
CourseEnrollmentSchema.index({ enrolled_at: -1 });
CourseEnrollmentSchema.index({ is_deleted: 1 });
