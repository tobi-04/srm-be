import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { LessonCommentReaction } from "./entities/lesson-comment-reaction.entity";

@Injectable()
export class LessonCommentReactionRepository {
  constructor(
    @InjectModel(LessonCommentReaction.name)
    private readonly model: Model<LessonCommentReaction>,
  ) {}

  async findByCommentId(commentId: string) {
    return this.model
      .find({ comment_id: new Types.ObjectId(commentId) })
      .exec();
  }

  async findByUserAndComment(userId: string, commentId: string) {
    return this.model
      .findOne({
        user_id: new Types.ObjectId(userId),
        comment_id: new Types.ObjectId(commentId),
      })
      .exec();
  }

  async findByUserAndCommentIds(userId: string, commentIds: Types.ObjectId[]) {
    return this.model
      .find({
        user_id: new Types.ObjectId(userId),
        comment_id: { $in: commentIds },
      })
      .exec();
  }

  async upsertReaction(userId: string, commentId: string, type: string) {
    return this.model
      .findOneAndUpdate(
        {
          user_id: new Types.ObjectId(userId),
          comment_id: new Types.ObjectId(commentId),
        },
        { type, updated_at: new Date() },
        { upsert: true, new: true },
      )
      .exec();
  }

  async removeReaction(userId: string, commentId: string) {
    return this.model
      .findOneAndDelete({
        user_id: new Types.ObjectId(userId),
        comment_id: new Types.ObjectId(commentId),
      })
      .exec();
  }

  async deleteByCommentId(commentId: string): Promise<any> {
    return this.model
      .deleteMany({ comment_id: new Types.ObjectId(commentId) })
      .exec();
  }

  async countReactionsGrouped(commentId: string) {
    return this.model
      .aggregate([
        { $match: { comment_id: new Types.ObjectId(commentId) } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ])
      .exec();
  }

  async countReactionsBulk(commentIds: Types.ObjectId[]) {
    return this.model
      .aggregate([
        { $match: { comment_id: { $in: commentIds } } },
        {
          $group: {
            _id: { comment_id: "$comment_id", type: "$type" },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();
  }
}
