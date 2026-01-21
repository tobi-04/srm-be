import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SalerDetails } from "./entities/saler-details.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class SalerDetailsRepository extends BaseRepository<SalerDetails> {
  protected readonly modelName = "SalerDetails";

  constructor(
    @InjectModel(SalerDetails.name)
    protected readonly model: Model<SalerDetails>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find saler details by user ID
   */
  async findByUserId(
    userId: string,
    useCache = true,
  ): Promise<SalerDetails | null> {
    return this.findOne({ user_id: userId } as any, {
      useCache,
      cacheTTL: 600,
    });
  }

  /**
   * Find saler details by code_saler
   */
  async findByCodeSaler(
    code: string,
    useCache = true,
  ): Promise<SalerDetails | null> {
    return this.findOne({ code_saler: code } as any, {
      useCache,
      cacheTTL: 600,
    });
  }

  /**
   * Update KPI targets
   */
  async updateKPI(userId: string, kpiData: any) {
    const updated = await this.model.findOneAndUpdate(
      { user_id: userId, is_deleted: false },
      { ...kpiData, updated_at: new Date() },
      { new: true },
    );

    if (updated) {
      await this.invalidateCache();
    }

    return updated;
  }

  /**
   * Assign courses to saler
   */
  async assignCourses(userId: string, courseIds: string[]) {
    const updated = await this.model.findOneAndUpdate(
      { user_id: userId, is_deleted: false },
      { assigned_courses: courseIds, updated_at: new Date() },
      { new: true },
    );

    if (updated) {
      await this.invalidateCache();
    }

    return updated;
  }

  /**
   * Update commissions
   */
  async updateCommissions(userId: string, commissionsData: any) {
    const updated = await this.model.findOneAndUpdate(
      { user_id: userId, is_deleted: false },
      { ...commissionsData, updated_at: new Date() },
      { new: true },
    );

    if (updated) {
      await this.invalidateCache();
    }

    return updated;
  }
}
