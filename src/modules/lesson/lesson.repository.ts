import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lesson } from './entities/lesson.entity';
import { BaseRepository } from '../../common/repositories/base.repository';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class LessonRepository extends BaseRepository<Lesson> {
  protected readonly modelName = 'Lesson';

  constructor(
    @InjectModel(Lesson.name) protected readonly model: Model<Lesson>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find lessons by course ID
   */
  async findByCourseId(courseId: string, includeDeleted = false): Promise<Lesson[]> {
    const filter: any = { course_id: courseId };
    if (!includeDeleted) {
      filter.is_deleted = false;
    }

    return this.model
      .find(filter)
      .sort({ order: 1, created_at: 1 })
      .exec();
  }

  /**
   * Find published lessons by course ID
   */
  async findPublishedByCourseId(courseId: string): Promise<Lesson[]> {
    return this.model
      .find({
        course_id: courseId,
        status: 'published',
        is_deleted: false,
      })
      .sort({ order: 1, created_at: 1 })
      .exec();
  }

  /**
   * Count lessons by course ID
   */
  async countByCourseId(courseId: string): Promise<number> {
    return this.model
      .countDocuments({
        course_id: courseId,
        is_deleted: false,
      })
      .exec();
  }

  /**
   * Update lesson order
   */
  async updateOrder(id: string, newOrder: number): Promise<Lesson | null> {
    return this.updateById(id, { order: newOrder } as any);
  }
}
