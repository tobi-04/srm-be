import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

@Schema({ collection: "courses", timestamps: false })
export class Course extends BaseEntity {
  @Prop({ required: true })
  title: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ required: true, min: 0, default: 0 })
  price: number;

  @Prop({ type: String, enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: "" })
  category: string;

  @Prop({ default: "" })
  thumbnail: string;

  @Prop({ type: Array, default: [] })
  syllabus: string[];
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);

// Add indexes
CourseSchema.index({ title: "text", description: "text" });
CourseSchema.index({ status: 1, is_deleted: 1 });
CourseSchema.index({ slug: 1 });
CourseSchema.index({ price: 1 });
