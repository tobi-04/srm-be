import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookStatus } from "../entities/book.entity";

export class CreateBookDto {
  @ApiProperty({
    description: "Book title",
    example: "NestJS for Beginners",
  })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({
    description: "Book description",
    example: "A comprehensive guide to backend development with NestJS",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Book price",
    example: 49.99,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: "Book discount percentage",
    example: 10,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiPropertyOptional({
    description: "Book status",
    enum: BookStatus,
    default: BookStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({
    description: "Book cover image URL",
  })
  @IsOptional()
  @IsString()
  cover_image?: string;
}

export class UpdateBookDto {
  @ApiPropertyOptional({
    description: "Book title",
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: "Book description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Book price",
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: "Book discount percentage",
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiPropertyOptional({
    description: "Book status",
    enum: BookStatus,
  })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({
    description: "Book cover image URL",
  })
  @IsOptional()
  @IsString()
  cover_image?: string;
}

export class SearchBookDto {
  @ApiPropertyOptional({
    description: "Search query for title or description",
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: BookStatus,
  })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;
}
