import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from '../../../common/entities/base.entity';

@Schema({ collection: 'lesson_files', timestamps: true })
export class LessonFile extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lesson', required: true, index: true })
  lesson_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true })
  mime: string;

  @Prop({ type: Number, default: 0 })
  size: number;
}

export type LessonFileDocument = LessonFile & Document;
export const LessonFileSchema = SchemaFactory.createForClass(LessonFile);

// Indexes
LessonFileSchema.index({ lesson_id: 1, created_at: -1 });
