import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Book, BookStatus } from "./entities/book.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class BookStoreRepository extends BaseRepository<Book> {
  protected readonly modelName = "Book";

  constructor(
    @InjectModel(Book.name) protected readonly model: Model<Book>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find book by slug
   */
  async findBySlug(slug: string, useCache = false): Promise<Book | null> {
    return this.findOne({ slug } as any, { useCache, cacheTTL: 600 });
  }

  /**
   * Search books by title or description
   */
  async searchBooks(query: string, page = 1, limit = 10, isAdmin = false) {
    const filter: any = {};
    if (!isAdmin) {
      filter.status = BookStatus.ACTIVE;
    }

    return this.paginate(filter, {
      page,
      limit,
      search: query,
      searchFields: ["title", "description"],
      useCache: true,
      cacheTTL: 300,
    });
  }
}
