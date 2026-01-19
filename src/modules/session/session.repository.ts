import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Session } from "./entities/session.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  protected readonly modelName = "Session";

  constructor(
    @InjectModel(Session.name) protected readonly model: Model<Session>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find session by session ID
   */
  async findBySessionId(
    sessionId: string,
    useCache = false,
  ): Promise<Session | null> {
    return this.findOne({ session_id: sessionId } as any, {
      useCache,
      cacheTTL: 300,
    });
  }

  /**
   * Add page visit to session
   */
  async addPageVisit(
    sessionId: string,
    pageVisit: { url: string; time_spent?: number },
  ): Promise<Session | null> {
    return this.model.findOneAndUpdate(
      { session_id: sessionId, is_deleted: false },
      {
        $push: {
          pages_visited: {
            url: pageVisit.url,
            visited_at: new Date(),
            time_spent: pageVisit.time_spent || 0,
          },
        },
        $set: { updated_at: new Date() },
      },
      { new: true },
    );
  }

  /**
   * End session
   */
  async endSession(
    sessionId: string,
    totalDuration: number,
  ): Promise<Session | null> {
    return this.model.findOneAndUpdate(
      { session_id: sessionId, is_deleted: false },
      {
        $set: {
          session_end: new Date(),
          total_duration: totalDuration,
          updated_at: new Date(),
        },
      },
      { new: true },
    );
  }

  /**
   * Mark session as converted
   */
  async markAsConverted(sessionId: string): Promise<Session | null> {
    return this.model.findOneAndUpdate(
      { session_id: sessionId, is_deleted: false },
      {
        $set: {
          is_converted: true,
          updated_at: new Date(),
        },
      },
      { new: true },
    );
  }

  /**
   * Link user to session
   */
  async linkUserToSession(
    sessionId: string,
    userId: string,
  ): Promise<Session | null> {
    return this.model.findOneAndUpdate(
      { session_id: sessionId, is_deleted: false },
      {
        $set: {
          user_id: userId,
          updated_at: new Date(),
        },
      },
      { new: true },
    );
  }

  /**
   * Get sessions by traffic source ID
   */
  async findByTrafficSourceId(trafficSourceId: string): Promise<Session[]> {
    return this.model.find({
      traffic_source_id: trafficSourceId,
      is_deleted: false,
    });
  }

  /**
   * Get sessions by user ID
   */
  async findByUserId(userId: string): Promise<Session[]> {
    return this.model.find({ user_id: userId, is_deleted: false });
  }
}
