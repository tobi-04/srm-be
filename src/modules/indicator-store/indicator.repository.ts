import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Indicator, IndicatorStatus } from "./entities/indicator.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class IndicatorRepository extends BaseRepository<Indicator> {
  protected readonly modelName = "Indicator";

  constructor(
    @InjectModel(Indicator.name) protected readonly model: Model<Indicator>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find indicator by slug
   */
  async findBySlug(slug: string, useCache = false): Promise<Indicator | null> {
    return this.findOne({ slug } as any, { useCache, cacheTTL: 600 });
  }

  /**
   * Search indicators by name or description
   */
  async searchIndicators(query: string, page = 1, limit = 10, isAdmin = false) {
    const filter: any = {};
    if (!isAdmin) {
      filter.status = IndicatorStatus.ACTIVE;
    }

    return this.paginate(filter, {
      page,
      limit,
      search: query,
      searchFields: ["name", "description"],
      useCache: true,
      cacheTTL: 300,
    });
  }
}
