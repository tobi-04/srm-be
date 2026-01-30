import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

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
    try {
      const keys = await this.keys(pattern);
      if (keys && keys.length > 0) {
        // Delete keys one by one to be safe with different stores
        for (const key of keys) {
          await this.cacheManager.del(key);
        }
      }
    } catch (error) {
      console.error(
        `[RedisCacheService] Error deleting pattern ${pattern}:`,
        error,
      );
    }
  }

  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const store = this.cacheManager.store as any;

      // cache-manager-redis-yet exposes keys on the store
      if (typeof store.keys === "function") {
        return await store.keys(pattern);
      }

      // Fallback for other stores that might have it differently
      if (store.client && typeof store.client.keys === "function") {
        return await store.client.keys(pattern);
      }

      return [];
    } catch (error) {
      console.error(
        `[RedisCacheService] Error fetching keys for pattern ${pattern}:`,
        error,
      );
      return [];
    }
  }

  generateKey(prefix: string, ...args: (string | number)[]): string {
    return `${prefix}:${args.join(":")}`;
  }
}
