import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsOptional,
  IsEnum,
} from "class-validator";

export class CreateLessonCommentDto {
  @ApiProperty({ description: "Lesson ID" })
  @IsMongoId()
  @IsNotEmpty()
  lesson_id: string;

  @ApiProperty({ description: "Comment content" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: "ID of the comment being replied to" })
  @IsMongoId()
  @IsOptional()
  replied_to?: string;
}

export class UpdateLessonCommentDto {
  @ApiProperty({ description: "Comment content" })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AddReactionDto {
  @ApiProperty({
    description: "Reaction type",
    enum: ["like", "love", "care", "haha", "wow", "sad", "angry"],
  })
  @IsEnum(["like", "love", "care", "haha", "wow", "sad", "angry"])
  @IsNotEmpty()
  type: string;
}
