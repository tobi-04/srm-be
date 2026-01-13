import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { AuditLog, AuditLogDocument } from './entities/audit-log.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  protected readonly model: any;
  protected readonly modelName = 'AuditLog';

  constructor(
    @InjectModel(AuditLog.name) auditLogModel: Model<AuditLogDocument>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
    this.model = auditLogModel;
  }

  /**
   * Get the model for advanced queries (e.g., aggregation)
   */
  getModel(): Model<AuditLogDocument> {
    return this.model;
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(
    entity: string,
    entityId: string,
    options?: {
      page?: number;
      limit?: number;
      useCache?: boolean;
    },
  ) {
    return this.paginate(
      { entity, entity_id: entityId },
      {
        ...options,
        sort: 'created_at',
        order: 'desc',
      },
    );
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      useCache?: boolean;
    },
  ) {
    return this.paginate(
      { user_id: userId },
      {
        ...options,
        sort: 'created_at',
        order: 'desc',
      },
    );
  }

  /**
   * Find audit logs by action
   */
  async findByAction(
    action: string,
    options?: {
      page?: number;
      limit?: number;
      useCache?: boolean;
    },
  ) {
    return this.paginate(
      { action },
      {
        ...options,
        sort: 'created_at',
        order: 'desc',
      },
    );
  }

  /**
   * Find audit logs within date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: {
      page?: number;
      limit?: number;
      useCache?: boolean;
    },
  ) {
    return this.paginate(
      {
        created_at: {
          $gte: startDate,
          $lte: endDate,
        },
      } as any,
      {
        ...options,
        sort: 'created_at',
        order: 'desc',
      },
    );
  }

  /**
   * Find audit logs by IP address
   */
  async findByIpAddress(
    ipAddress: string,
    options?: {
      page?: number;
      limit?: number;
      useCache?: boolean;
    },
  ) {
    return this.paginate(
      { ip_address: ipAddress },
      {
        ...options,
        sort: 'created_at',
        order: 'desc',
      },
    );
  }
}
