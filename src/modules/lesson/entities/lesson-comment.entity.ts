import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from '../../../common/entities/base.entity';

@Schema({ collection: 'lesson_comments', timestamps: true })
export class LessonComment extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true, index: true })
  lesson_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LessonComment', default: null, index: true })
  replied_to: MongooseSchema.Types.ObjectId | null;
}

export type LessonCommentDocument = LessonComment & Document;
export const LessonCommentSchema = SchemaFactory.createForClass(LessonComment);

// Indexes
LessonCommentSchema.index({ lesson_id: 1, created_at: -1 });
LessonCommentSchema.index({ lesson_id: 1, replied_to: 1 });
LessonCommentSchema.index({ user_id: 1, created_at: -1 });
