import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "lessons", timestamps: true })
export class Lesson extends BaseEntity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Course",
    required: true,
    index: true,
  })
  course_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ type: [String], default: [] })
  main_content: string[];

  @Prop({ trim: true })
  video: string;

  @Prop({
    type: String,
    enum: ["draft", "published"],
    default: "draft",
    lowercase: true,
    index: true,
  })
  status: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ type: Number, default: 0 })
  chapter_index: number;
}

export type LessonDocument = Lesson & Document;
export const LessonSchema = SchemaFactory.createForClass(Lesson);

// Indexes
LessonSchema.index({ course_id: 1, order: 1 });
LessonSchema.index({ course_id: 1, status: 1 });
LessonSchema.index({ title: "text", description: "text" });
