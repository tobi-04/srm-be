import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsOptional,
  IsDateString,
  ValidateIf,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateStepDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  step_order: number;

  @ApiProperty({
    example: 0,
    description:
      "Delay in minutes (0 = immediate). Legacy field. Either this or scheduled_at must be provided.",
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  delay_minutes?: number;

  @ApiProperty({
    example: "2026-01-24T14:30:00.000Z",
    description:
      "ISO datetime string for scheduled sending. Either this or delay_minutes must be provided.",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @ApiProperty({ example: "Welcome to {{user.name}}!" })
  @IsString()
  @IsNotEmpty()
  subject_template: string;

  @ApiProperty({
    example: "<h1>Hello {{user.name}}</h1><p>Welcome to our platform!</p>",
  })
  @IsString()
  @IsNotEmpty()
  body_template: string;

  @ApiProperty({ example: "60d0fe4f53112b00155a3001", required: false })
  @IsString()
  @IsOptional()
  automation_id: string;
}

export class UpdateStepDto {
  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  step_order?: number;

  @ApiProperty({
    example: 1440,
    required: false,
    description: "Delay in minutes. Legacy field.",
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  delay_minutes?: number;

  @ApiProperty({
    example: "2026-01-24T14:30:00.000Z",
    description: "ISO datetime string for scheduled sending",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduled_at?: string;

  @ApiProperty({ example: "Welcome to {{user.name}}!", required: false })
  @IsString()
  @IsOptional()
  subject_template?: string;

  @ApiProperty({ example: "<h1>Hello {{user.name}}</h1>", required: false })
  @IsString()
  @IsOptional()
  body_template?: string;
}
