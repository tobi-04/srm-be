import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TrafficSource } from "./entities/traffic-source.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class TrafficSourceRepository extends BaseRepository<TrafficSource> {
  protected readonly modelName = "TrafficSource";

  constructor(
    @InjectModel(TrafficSource.name)
    protected readonly model: Model<TrafficSource>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find traffic source by session ID
   */
  async findBySessionId(
    sessionId: string,
    useCache = true,
  ): Promise<TrafficSource | null> {
    return this.findOne({ session_id: sessionId } as any, {
      useCache,
      cacheTTL: 600,
    });
  }

  /**
   * Get analytics grouped by source
   */
  async getAnalyticsBySource(startDate?: Date, endDate?: Date): Promise<any[]> {
    const matchStage: any = { is_deleted: false };
    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) matchStage.created_at.$gte = startDate;
      if (endDate) matchStage.created_at.$lte = endDate;
    }

    return this.model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$utm_source",
          count: { $sum: 1 },
          campaigns: { $addToSet: "$utm_campaign" },
        },
      },
      {
        $project: {
          utm_source: "$_id",
          count: 1,
          unique_campaigns: { $size: "$campaigns" },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get analytics grouped by campaign
   */
  async getAnalyticsByCampaign(
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const matchStage: any = { is_deleted: false };
    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) matchStage.created_at.$gte = startDate;
      if (endDate) matchStage.created_at.$lte = endDate;
    }

    return this.model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { campaign: "$utm_campaign", source: "$utm_source" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          utm_campaign: "$_id.campaign",
          utm_source: "$_id.source",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get funnel statistics
   */
  async getFunnelStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ total_traffic_sources: number }> {
    const matchStage: any = { is_deleted: false };
    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) matchStage.created_at.$gte = startDate;
      if (endDate) matchStage.created_at.$lte = endDate;
    }

    const total = await this.model.countDocuments(matchStage);
    return { total_traffic_sources: total };
  }
}
