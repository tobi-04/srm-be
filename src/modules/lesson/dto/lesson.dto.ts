import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsMongoId,
  Min,
} from "class-validator";

export class CreateLessonDto {
  @ApiProperty({
    description: "Course ID",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  @IsNotEmpty()
  course_id: string;

  @ApiProperty({
    description: "Lesson title",
    example: "Introduction to Marketing",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: "Lesson description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Main content paragraphs",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  main_content?: string[];

  @ApiPropertyOptional({ description: "YouTube video URL" })
  @IsString()
  @IsOptional()
  video?: string;

  @ApiPropertyOptional({
    description: "Lesson status",
    enum: ["draft", "published"],
    default: "draft",
  })
  @IsEnum(["draft", "published"])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Display order", default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: "Chapter index (0-based reference to syllabus)",
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  chapter_index?: number;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  @ApiPropertyOptional({ description: "Course ID" })
  @IsMongoId()
  @IsOptional()
  course_id?: string;
}

export class SearchLessonDto {
  @ApiPropertyOptional({
    description: "Filter by status",
    enum: ["draft", "published"],
  })
  @IsEnum(["draft", "published"])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Filter by course ID" })
  @IsMongoId()
  @IsOptional()
  course_id?: string;
}
