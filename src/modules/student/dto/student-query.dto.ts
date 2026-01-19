import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from "class-validator";
import { Type } from "class-transformer";

export enum CourseStatusFilter {
  ALL = "all",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export class StudentCoursesQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CourseStatusFilter)
  status?: CourseStatusFilter = CourseStatusFilter.ALL;
}

export class StudentOrdersQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}
