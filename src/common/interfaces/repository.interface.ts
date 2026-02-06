export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface RepositoryOptions {
  useCache?: boolean;
  cacheTTL?: number;
}

export interface FindOptions extends RepositoryOptions {
  select?: string[];
  populate?: any[];

  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginateOptions extends FindOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  searchFields?: string[];
  includeDeleted?: boolean; // Include soft-deleted items
}
