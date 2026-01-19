import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum LessonProgressStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

@Schema({ collection: "lesson_progress", timestamps: false })
export class LessonProgress extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  user_id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Course", required: true })
  course_id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Lesson", required: true })
  lesson_id: string;

  @Prop({
    type: String,
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
  })
  status: LessonProgressStatus;

  @Prop({ type: Number, default: 0 })
  watch_time: number; // unique seconds watched

  @Prop({ type: Number, default: 0 })
  last_position: number; // last video position in seconds

  @Prop({ type: Number, default: 0 })
  duration: number; // total video duration in seconds

  @Prop({ type: Number, default: 0 })
  progress_percent: number; // completion percentage (0-100)

  @Prop({
    type: [
      {
        start: { type: Number, required: true },
        end: { type: Number, required: true },
      },
    ],
    default: [],
  })
  watched_segments: { start: number; end: number }[];

  @Prop({ type: Date, required: false })
  started_at?: Date;

  @Prop({ type: Date, required: false })
  completed_at?: Date;
}

export type LessonProgressDocument = HydratedDocument<LessonProgress>;
export const LessonProgressSchema =
  SchemaFactory.createForClass(LessonProgress);

// Indexes for efficient querying
LessonProgressSchema.index(
  { user_id: 1, course_id: 1, lesson_id: 1 },
  { unique: true },
);
LessonProgressSchema.index({ user_id: 1, course_id: 1 });
LessonProgressSchema.index({ user_id: 1 });
LessonProgressSchema.index({ lesson_id: 1 });
LessonProgressSchema.index({ status: 1 });
