import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from '../../../common/entities/base.entity';

@Schema({ collection: 'lesson_notes', timestamps: true })
export class LessonNote extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true, index: true })
  lesson_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;
}

export type LessonNoteDocument = LessonNote & Document;
export const LessonNoteSchema = SchemaFactory.createForClass(LessonNote);

// Indexes
LessonNoteSchema.index({ lesson_id: 1, user_id: 1, created_at: -1 });
LessonNoteSchema.index({ user_id: 1, created_at: -1 });
