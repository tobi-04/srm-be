import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsMongoId } from "class-validator";

export class CreateLessonNoteDto {
  @ApiProperty({ description: "Lesson ID" })
  @IsMongoId()
  @IsNotEmpty()
  lesson_id: string;

  @ApiProperty({ description: "Note content" })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateLessonNoteDto {
  @ApiProperty({ description: "Note content" })
  @IsString()
  @IsNotEmpty()
  content: string;
}
