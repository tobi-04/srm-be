import { Model, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { BaseEntity } from '../entities/base.entity';
import { RedisCacheService } from '../cache/redis-cache.service';
import {
  PaginatedResult,
  PaginateOptions,
  FindOptions,
  RepositoryOptions,
} from '../interfaces/repository.interface';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract readonly model: Model<T>;
  protected abstract readonly modelName: string;
  protected readonly cacheService: RedisCacheService;

  constructor(cacheService: RedisCacheService) {
    this.cacheService = cacheService;
  }

  /**
   * Paginate with search and filtering
   */
  async paginate(
    filter: FilterQuery<T> = {},
    options: PaginateOptions = {},
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'desc',
      search,
      searchFields = [],
      useCache = true,
      cacheTTL = 300,
      select,
      populate,
      includeDeleted = false, // Default: exclude deleted items
    } = options;

    const cacheKey = this.cacheService.generateKey(
      `${this.modelName}:paginate`,
      JSON.stringify(filter),
      page.toString(),
      limit.toString(),
      sort,
      order,
      search || '',
      includeDeleted.toString(),
    );

    if (useCache) {
      const cached = await this.cacheService.get<PaginatedResult<T>>(cacheKey);
      if (cached) return cached;
    }

    const queryFilter: FilterQuery<T> = {
      ...filter,
    };

    // Only filter out deleted items if includeDeleted is false
    if (!includeDeleted) {
      queryFilter.is_deleted = false;
    }

    if (search && searchFields.length > 0) {
      queryFilter.$or = searchFields.map(field => ({
        [field]: { $regex: search, $options: 'i' },
      })) as any;
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    let query = this.model
      .find(queryFilter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limit);

    if (select) {
      query = query.select(select.join(' '));
    }

    if (populate) {
      populate.forEach(path => {
        query = query.populate(path);
      });
    }

    const [data, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(queryFilter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const result: PaginatedResult<T> = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    if (useCache) {
      await this.cacheService.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Find by ID
   */
  async findById(
    id: string | Types.ObjectId,
    options: FindOptions = {},
  ): Promise<T | null> {
    const { useCache = true, cacheTTL = 300, select, populate } = options;

    const cacheKey = this.cacheService.generateKey(
      `${this.modelName}:findById`,
      id.toString(),
    );

    if (useCache) {
      const cached = await this.cacheService.get<T>(cacheKey);
      if (cached) return cached;
    }

    let query = this.model.findOne({
      _id: id,
      is_deleted: false,
    } as FilterQuery<T>);

    if (select) {
      query = query.select(select.join(' '));
    }

    if (populate) {
      populate.forEach(path => {
        query = query.populate(path);
      });
    }

    const result = await query.exec();

    if (result && useCache) {
      await this.cacheService.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Find one by filter
   */
  async findOne(
    filter: FilterQuery<T>,
    options: FindOptions = {},
  ): Promise<T | null> {
    const { useCache = true, cacheTTL = 300, select, populate } = options;

    const cacheKey = this.cacheService.generateKey(
      `${this.modelName}:findOne`,
      JSON.stringify(filter),
    );

    if (useCache) {
      const cached = await this.cacheService.get<T>(cacheKey);
      if (cached) return cached;
    }

    let query = this.model.findOne({
      ...filter,
      is_deleted: false,
    } as FilterQuery<T>);

    if (select) {
      query = query.select(select.join(' '));
    }

    if (populate) {
      populate.forEach(path => {
        query = query.populate(path);
      });
    }

    const result = await query.exec();

    if (result && useCache) {
      await this.cacheService.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Find all by filter
   */
  async findAll(
    filter: FilterQuery<T> = {},
    options: FindOptions = {},
  ): Promise<T[]> {
    const { useCache = true, cacheTTL = 300, select, populate } = options;

    const cacheKey = this.cacheService.generateKey(
      `${this.modelName}:findAll`,
      JSON.stringify(filter),
    );

    if (useCache) {
      const cached = await this.cacheService.get<T[]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.model.find({
      ...filter,
      is_deleted: false,
    } as FilterQuery<T>);

    if (select) {
      query = query.select(select.join(' '));
    }

    if (populate) {
      populate.forEach(path => {
        query = query.populate(path);
      });
    }

    const result = await query.exec();

    if (useCache) {
      await this.cacheService.set(cacheKey, result, cacheTTL);
    }

    return result;
  }

  /**
   * Create a new document
   */
  async create(
    data: Partial<T>,
    options: RepositoryOptions = {},
  ): Promise<T> {
    const now = new Date();
    const document = new this.model({
      ...data,
      created_at: now,
      updated_at: now,
      is_deleted: false,
    });

    const result = await document.save();

    await this.invalidateCache();

    return result;
  }

  /**
   * Create many documents
   */
  async createMany(
    dataArray: Partial<T>[],
    options: RepositoryOptions = {},
  ): Promise<T[]> {
    const now = new Date();
    const documents = dataArray.map(data => ({
      ...data,
      created_at: now,
      updated_at: now,
      is_deleted: false,
    }));

    const result = await this.model.insertMany(documents);

    await this.invalidateCache();

    return result as any as T[];
  }

  /**
   * Update by ID
   */
  async updateById(
    id: string | Types.ObjectId,
    update: UpdateQuery<T>,
    options: RepositoryOptions = {},
  ): Promise<T | null> {
    const result = await this.model.findOneAndUpdate(
      {
        _id: id,
        is_deleted: false,
      } as FilterQuery<T>,
      {
        ...update,
        updated_at: new Date(),
      },
      { new: true },
    );

    if (result) {
      await this.invalidateCache();
      await this.invalidateCacheById(id.toString());
    }

    return result;
  }

  /**
   * Update many by filter
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: RepositoryOptions = {},
  ): Promise<number> {
    const result = await this.model.updateMany(
      {
        ...filter,
        is_deleted: false,
      } as FilterQuery<T>,
      {
        ...update,
        updated_at: new Date(),
      },
    );

    await this.invalidateCache();

    return result.modifiedCount;
  }

  /**
   * Soft delete by ID
   */
  async deleteById(
    id: string | Types.ObjectId,
    options: RepositoryOptions = {},
  ): Promise<T | null> {
    const result = await this.model.findOneAndUpdate(
      {
        _id: id,
        is_deleted: false,
      } as FilterQuery<T>,
      {
        is_deleted: true,
        updated_at: new Date(),
      },
      { new: true },
    );

    if (result) {
      await this.invalidateCache();
      await this.invalidateCacheById(id.toString());
    }

    return result;
  }

  /**
   * Soft delete many by filter
   */
  async deleteMany(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {},
  ): Promise<number> {
    const result = await this.model.updateMany(
      {
        ...filter,
        is_deleted: false,
      } as FilterQuery<T>,
      {
        is_deleted: true,
        updated_at: new Date(),
      },
    );

    await this.invalidateCache();

    return result.modifiedCount;
  }

  /**
   * Hard delete by ID (permanent)
   */
  async hardDeleteById(
    id: string | Types.ObjectId,
    options: RepositoryOptions = {},
  ): Promise<T | null> {
    const result = await this.model.findByIdAndDelete(id);

    if (result) {
      await this.invalidateCache();
      await this.invalidateCacheById(id.toString());
    }

    return result;
  }

  /**
   * Hard delete many (permanent)
   */
  async hardDeleteMany(
    filter: FilterQuery<T>,
    options: RepositoryOptions = {},
  ): Promise<number> {
    const result = await this.model.deleteMany(filter);

    await this.invalidateCache();

    return result.deletedCount;
  }

  /**
   * Restore soft deleted document
   */
  async restore(
    id: string | Types.ObjectId,
    options: RepositoryOptions = {},
  ): Promise<T | null> {
    const result = await this.model.findOneAndUpdate(
      {
        _id: id,
        is_deleted: true,
      } as FilterQuery<T>,
      {
        is_deleted: false,
        updated_at: new Date(),
      },
      { new: true },
    );

    if (result) {
      await this.invalidateCache();
    }

    return result;
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments({
      ...filter,
      is_deleted: false,
    } as FilterQuery<T>);
  }

  /**
   * Check if exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments({
      ...filter,
      is_deleted: false,
    } as FilterQuery<T>);
    return count > 0;
  }

  /**
   * Invalidate all cache for this model
   */
  protected async invalidateCache(): Promise<void> {
    await this.cacheService.delByPattern(`${this.modelName}:*`);
  }

  /**
   * Invalidate cache for specific ID
   */
  protected async invalidateCacheById(id: string): Promise<void> {
    await this.cacheService.del(
      this.cacheService.generateKey(`${this.modelName}:findById`, id),
    );
  }
}
