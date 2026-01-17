import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from './entities/course.entity';
import { BaseRepository } from '../../common/repositories/base.repository';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class CourseRepository extends BaseRepository<Course> {
  protected readonly modelName = 'Course';

  constructor(
    @InjectModel(Course.name) protected readonly model: Model<Course>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find course by slug
   */
  async findBySlug(slug: string, useCache = false): Promise<Course | null> {
    console.log('📦 Repository - Finding by slug:', slug);
    const result = await this.findOne(
      { slug } as any,
      { useCache, cacheTTL: 600 },
    );
    console.log('📦 Repository - Result:', result);
    return result;
  }

  /**
   * Search courses by title or description
   */
  async searchCourses(query: string, page = 1, limit = 10) {
    return this.paginate(
      {},
      {
        page,
        limit,
        search: query,
        searchFields: ['title', 'description'],
        useCache: true,
        cacheTTL: 300,
      },
    );
  }

  /**
   * Find published courses (for public view)
   */
  async findPublishedCourses(page = 1, limit = 10) {
    return this.paginate(
      { status: 'published' } as any,
      {
        page,
        limit,
        sort: 'created_at',
        order: 'desc',
        useCache: true,
        cacheTTL: 600,
      },
    );
  }
}
