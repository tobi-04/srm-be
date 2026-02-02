import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { LessonComment } from "./entities/lesson-comment.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class LessonCommentRepository extends BaseRepository<LessonComment> {
  protected readonly modelName = "LessonComment";

  constructor(
    @InjectModel(LessonComment.name)
    protected readonly model: Model<LessonComment>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }
  async findAllWithUser(lessonId: string) {
    return this.model
      .aggregate([
        {
          $match: {
            lesson_id: new Types.ObjectId(lessonId),
            is_deleted: false,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_info",
          },
        },
        { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            content: 1,
            lesson_id: 1,
            replied_to: 1,
            created_at: 1,
            updated_at: 1,
            // Gán thẳng thông tin user vào user_id
            user_id: {
              $cond: {
                if: "$user_info",
                then: {
                  _id: "$user_info._id",
                  name: "$user_info.name",
                  email: "$user_info.email",
                },
                else: "$user_id", // Giữ nguyên ID nếu không tìm thấy user
              },
            },
            // Giữ lại trường user để tương thích ngược nếu cần (hoặc có thể bỏ)
            user: {
              $cond: {
                if: "$user_info",
                then: {
                  _id: "$user_info._id",
                  name: "$user_info.name",
                  email: "$user_info.email",
                },
                else: null,
              },
            },
          },
        },
        { $sort: { created_at: 1 } },
      ])
      .exec();
  }
}
