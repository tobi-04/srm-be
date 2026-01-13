import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.del(key)));
    }
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  async keys(pattern: string): Promise<string[]> {
    const store = this.cacheManager.store as any;
    if (store.keys) {
      return await store.keys(pattern);
    }
    return [];
  }

  generateKey(prefix: string, ...args: (string | number)[]): string {
    return `${prefix}:${args.join(':')}`;
  }
}
