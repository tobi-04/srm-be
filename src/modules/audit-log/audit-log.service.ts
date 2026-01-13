import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { CreateAuditLogDto, FilterAuditLogDto } from './dto/audit-log.dto';
import { Types } from 'mongoose';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Create an audit log entry
   */
  async create(createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogRepository.create(createAuditLogDto);
  }

  /**
   * Log an action with automatic timestamp
   */
  async log(
    action: string,
    entity: string,
    entityId: Types.ObjectId | string,
    userId?: Types.ObjectId | string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>,
    metadata?: {
      ip_address?: string;
      user_agent?: string;
      [key: string]: any;
    },
  ) {
    return this.create({
      action,
      entity,
      entity_id: typeof entityId === 'string' ? new Types.ObjectId(entityId) : entityId,
      user_id: userId ? (typeof userId === 'string' ? new Types.ObjectId(userId) : userId) : undefined,
      old_data: oldData,
      new_data: newData,
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
      metadata: metadata ? Object.fromEntries(
        Object.entries(metadata).filter(([key]) => !['ip_address', 'user_agent'].includes(key))
      ) : undefined,
    });
  }

  /**
   * Find all audit logs with filtering and pagination
   */
  async findAll(
    filter: FilterAuditLogDto = {},
    page: number = 1,
    limit: number = 10,
    useCache: boolean = false,
  ) {
    const query: any = {};

    if (filter.action) {
      query.action = filter.action;
    }

    if (filter.entity) {
      query.entity = filter.entity;
    }

    if (filter.entity_id) {
      query.entity_id = new Types.ObjectId(filter.entity_id);
    }

    if (filter.user_id) {
      query.user_id = new Types.ObjectId(filter.user_id);
    }

    if (filter.ip_address) {
      query.ip_address = filter.ip_address;
    }

    if (filter.start_date || filter.end_date) {
      query.created_at = {};
      if (filter.start_date) {
        query.created_at.$gte = new Date(filter.start_date);
      }
      if (filter.end_date) {
        query.created_at.$lte = new Date(filter.end_date);
      }
    }

    return this.auditLogRepository.paginate(query, {
      page,
      limit,
      sort: 'created_at',
      order: 'desc',
      useCache,
    });
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(
    entity: string,
    entityId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.auditLogRepository.findByEntity(entity, entityId, {
      page,
      limit,
      useCache: true,
    });
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.auditLogRepository.findByUser(userId, {
      page,
      limit,
      useCache: true,
    });
  }

  /**
   * Find audit logs by action
   */
  async findByAction(
    action: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.auditLogRepository.findByAction(action, {
      page,
      limit,
      useCache: true,
    });
  }

  /**
   * Find audit logs by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.auditLogRepository.findByDateRange(startDate, endDate, {
      page,
      limit,
      useCache: true,
    });
  }

  /**
   * Find audit logs by IP address
   */
  async findByIpAddress(
    ipAddress: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.auditLogRepository.findByIpAddress(ipAddress, {
      page,
      limit,
      useCache: true,
    });
  }

  /**
   * Find a specific audit log by ID
   */
  async findOne(id: string) {
    return this.auditLogRepository.findById(id, { useCache: true });
  }

  /**
   * Get audit log statistics
   */
  async getStatistics() {
    const [totalLogs, actionCounts] = await Promise.all([
      this.auditLogRepository.count({}),
      this.auditLogRepository.getModel().aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      total: totalLogs,
      by_action: actionCounts.map(item => ({
        action: item._id,
        count: item.count,
      })),
    };
  }
}
