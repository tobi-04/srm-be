import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';
import { BaseRepository } from '../../common/repositories/base.repository';
import { RedisCacheService } from '../../common/cache/redis-cache.service';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  protected readonly modelName = 'User';

  constructor(
    @InjectModel(User.name) protected readonly model: Model<User>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, useCache = true): Promise<User | null> {
    return this.findOne(
      { email } as any,
      { useCache, cacheTTL: 600 },
    );
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string, page = 1, limit = 10) {
    return this.paginate(
      {},
      {
        page,
        limit,
        search: query,
        searchFields: ['name', 'email'],
        useCache: true,
        cacheTTL: 300,
      },
    );
  }

  /**
   * Find active users
   */
  async findActiveUsers(page = 1, limit = 10) {
    return this.paginate(
      { is_active: true } as any,
      {
        page,
        limit,
        sort: 'created_at',
        order: 'desc',
        useCache: true,
      },
    );
  }
}
