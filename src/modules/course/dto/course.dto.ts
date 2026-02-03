import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CourseStatus } from "../entities/course.entity";

export class CreateCourseDto {
  @ApiProperty({
    description: "Course title",
    example: "Advanced React Development",
  })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({
    description: "Course description",
    example: "Learn advanced React patterns and best practices",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Course price (can be 0 for free)",
    example: 99.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: "Course status",
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: "Course category",
    example: "Web Development",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Course thumbnail image URL",
    example: "https://example.com/course-thumbnail.jpg",
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: "Course syllabus (array of topics)",
    example: ["React Hooks", "Context API", "Performance Optimization"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional({
    description: "Course title",
    example: "Advanced React Development",
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: "Course description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Course price",
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: "Course status",
    enum: CourseStatus,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: "Course category",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Course thumbnail image URL",
  })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: "Course syllabus",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syllabus?: string[];
}

export class SearchCourseDto {
  @ApiPropertyOptional({
    description: "Search query for title or description",
    example: "react",
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: CourseStatus,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: "Filter by category",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Minimum price",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: "Maximum price",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
