# Backend Core Architecture

This backend implements a robust, production-ready architecture with CASC fields, Redis caching, and a flexible repository pattern.

## Architecture Overview

### 1. Base Entity (CASC Fields)
All entities extend `BaseEntity` which provides:
- `id`: MongoDB ObjectId (accessible as string via getter)
- `created_at`: Timestamp when document was created
- `updated_at`: Timestamp when document was last updated
- `is_deleted`: Soft delete flag

**Location**: [src/common/entities/base.entity.ts](src/common/entities/base.entity.ts)

### 2. Redis Cache Layer
Global caching system with automatic key management and pattern-based invalidation.

**Features**:
- Automatic cache key generation
- Pattern-based cache invalidation
- Configurable TTL per operation
- Optional caching per query

**Location**: [src/common/cache/](src/common/cache/)

### 3. Base Repository Pattern
Generic repository providing CRUD operations with built-in caching.

**Core Methods**:
- `paginate()` - Paginated results with search and filtering
- `findById()` - Find single document by ID
- `findOne()` - Find single document by filter
- `findAll()` - Find all documents matching filter
- `create()` - Create single document
- `createMany()` - Bulk create documents
- `updateById()` - Update single document by ID
- `updateMany()` - Bulk update documents
- `deleteById()` - Soft delete by ID
- `deleteMany()` - Bulk soft delete
- `hardDeleteById()` - Permanent delete by ID
- `hardDeleteMany()` - Bulk permanent delete
- `restore()` - Restore soft-deleted document
- `count()` - Count documents
- `exists()` - Check if document exists

**Location**: [src/common/repositories/base.repository.ts](src/common/repositories/base.repository.ts)

## Usage Example: User Module

### Entity Definition

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseEntity } from '../../common/entities/base.entity';

@Schema({ collection: 'users', timestamps: false })
export class User extends BaseEntity {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### Repository Implementation

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  protected readonly modelName = 'User';

  constructor(
    @InjectModel(User.name) protected readonly model: Model<User>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  // Custom methods
  async findByEmail(email: string, useCache = true): Promise<User | null> {
    return this.findOne({ email } as any, { useCache, cacheTTL: 600 });
  }

  async searchUsers(query: string, page = 1, limit = 10) {
    return this.paginate({}, {
      page,
      limit,
      search: query,
      searchFields: ['name', 'email'],
      useCache: true,
      cacheTTL: 300,
    });
  }
}
```

## API Endpoints (User Module)

### Create User
```
POST /users
Body: { "email": "user@example.com", "name": "John Doe", "password": "secret123" }
```

### Bulk Create Users
```
POST /users/bulk
Body: [{ "email": "...", "name": "...", "password": "..." }, ...]
```

### Get All Users (Paginated)
```
GET /users?page=1&limit=10&sort=created_at&order=desc&search=john
Query Params:
  - page: number (default: 1)
  - limit: number (default: 10, max: 100)
  - sort: string (default: created_at)
  - order: 'asc' | 'desc' (default: desc)
  - search: string (searches in name and email)
  - role: string (filter by role)
  - is_active: boolean (filter by active status)
```

### Search Users
```
GET /users/search?q=john&page=1&limit=10
```

### Get Single User
```
GET /users/:id
```

### Update User
```
PUT /users/:id
Body: { "name": "Jane Doe", "is_active": false }
```

### Soft Delete User
```
DELETE /users/:id
```

### Bulk Delete Users
```
DELETE /users/bulk/delete
Body: { "ids": ["id1", "id2", "id3"] }
```

### Restore Deleted User
```
PUT /users/:id/restore
```

## Repository Options

All repository methods support optional configuration:

```typescript
interface RepositoryOptions {
  useCache?: boolean;      // Enable/disable caching (default: true)
  cacheTTL?: number;       // Cache time-to-live in seconds (default: 300)
}

interface FindOptions extends RepositoryOptions {
  select?: string[];       // Fields to select
  populate?: string[];     // Relations to populate
}

interface PaginateOptions extends FindOptions {
  page?: number;           // Page number
  limit?: number;          // Items per page
  sort?: string;           // Field to sort by
  order?: 'asc' | 'desc';  // Sort order
  search?: string;         // Search query
  searchFields?: string[]; // Fields to search in
}
```

## Caching Strategy

### Automatic Cache Invalidation
- Cache is automatically invalidated on create, update, and delete operations
- Pattern-based invalidation clears all related cache entries
- Individual document caches are cleared on specific updates

### Cache Keys
Cache keys follow the pattern: `ModelName:operation:params`

Examples:
- `User:findById:507f1f77bcf86cd799439011`
- `User:paginate:{}:1:10:created_at:desc:`
- `User:findOne:{"email":"user@example.com"}`

### Manual Cache Control

```typescript
// Disable cache for specific query
await userRepository.findById(id, { useCache: false });

// Custom cache TTL
await userRepository.findAll({}, { useCache: true, cacheTTL: 3600 });

// Invalidate all user caches
await userRepository['invalidateCache']();
```

## Creating New Modules

1. **Create Entity** extending `BaseEntity`
2. **Create Repository** extending `BaseRepository`
3. **Create Service** using the repository
4. **Create Controller** for API endpoints
5. **Create Module** and import in `AppModule`

Example:

```typescript
// 1. Entity
@Schema({ collection: 'products' })
export class Product extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}

// 2. Repository
@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  protected readonly modelName = 'Product';

  constructor(
    @InjectModel(Product.name) protected readonly model: Model<Product>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }
}

// 3. Service
@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findAll(paginationDto: PaginationDto) {
    return this.productRepository.paginate({}, {
      page: paginationDto.page,
      limit: paginationDto.limit,
      sort: paginationDto.sort || 'created_at',
      order: paginationDto.order,
    });
  }
}

// 4. Controller
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.productService.findAll(paginationDto);
  }
}

// 5. Module
@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
```

## Environment Variables

```env
# Server
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/srm-lesson

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600
REDIS_MAX_ITEMS=100
```

## Prerequisites

1. **MongoDB** - Running on `localhost:27017` or configure via `MONGODB_URI`
2. **Redis** - Running on `localhost:6379` or configure via `REDIS_HOST` and `REDIS_PORT`

## Running the Application

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start:prod
```

## Project Structure

```
src/
├── common/
│   ├── cache/
│   │   ├── redis-cache.module.ts
│   │   └── redis-cache.service.ts
│   ├── dto/
│   │   └── pagination.dto.ts
│   ├── entities/
│   │   └── base.entity.ts
│   ├── interfaces/
│   │   └── repository.interface.ts
│   └── repositories/
│       └── base.repository.ts
├── modules/
│   └── user/
│       ├── dto/
│       │   └── user.dto.ts
│       ├── entities/
│       │   └── user.entity.ts
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       └── user.module.ts
├── app.module.ts
└── main.ts
```

## Best Practices

1. **Always use the repository layer** - Never access models directly from services
2. **Leverage caching** - Use `useCache: true` for read-heavy operations
3. **Soft delete by default** - Use `deleteById()` instead of `hardDeleteById()`
4. **Validate input** - Use DTOs with class-validator decorators
5. **Select only needed fields** - Use `select` option to reduce data transfer
6. **Index your schemas** - Add appropriate indexes for search fields
7. **Monitor cache hit rates** - Track cache performance in production

## Advanced Features

### Custom Search Fields
```typescript
await repository.paginate({}, {
  search: 'john',
  searchFields: ['name', 'email', 'username'],
});
```

### Field Selection
```typescript
await repository.findById(id, {
  select: ['-password', '-secretField'],
});
```

### Population
```typescript
await repository.findAll({}, {
  populate: ['author', 'comments'],
});
```

### Soft Delete Queries
```typescript
// Only non-deleted (default)
await repository.findAll({});

// Include deleted
await repository.model.find({ is_deleted: true });

// Restore deleted
await repository.restore(id);
```
