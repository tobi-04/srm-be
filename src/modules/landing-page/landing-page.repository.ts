import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LandingPage } from './entities/landing-page.entity';
import { BaseRepository } from '../../common/repositories/base.repository';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class LandingPageRepository extends BaseRepository<LandingPage> {
  protected readonly modelName = 'LandingPage';

  constructor(
    @InjectModel(LandingPage.name) protected readonly model: Model<LandingPage>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find landing page by slug
   */
  async findBySlug(slug: string, useCache = true): Promise<LandingPage | null> {
    return this.findOne(
      { slug } as any,
      { useCache, cacheTTL: 600 },
    );
  }

  /**
   * Find landing pages by course ID
   */
  async findByCourseId(courseId: string, useCache = true): Promise<LandingPage[]> {
    const query = { course_id: courseId } as any;
    const result = await this.paginate(query, {
      page: 1,
      limit: 100,
      useCache,
      cacheTTL: 300,
    });
    return result.data;
  }

  /**
   * Find published landing page by slug (for public view)
   */
  async findPublishedBySlug(slug: string): Promise<LandingPage | null> {
    return this.findOne(
      { slug, status: 'published' } as any,
      { useCache: true, cacheTTL: 600 },
    );
  }
}
