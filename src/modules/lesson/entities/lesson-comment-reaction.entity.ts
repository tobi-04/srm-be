import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'lesson_comment_reactions', timestamps: true })
export class LessonCommentReaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LessonComment', required: true, index: true })
  comment_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'],
    required: true,
  })
  type: string;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export type LessonCommentReactionDocument = LessonCommentReaction & Document;
export const LessonCommentReactionSchema = SchemaFactory.createForClass(LessonCommentReaction);

// Unique index: one user can only have one reaction per comment
LessonCommentReactionSchema.index({ comment_id: 1, user_id: 1 }, { unique: true });
LessonCommentReactionSchema.index({ comment_id: 1, type: 1 });
