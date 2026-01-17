import { IsString, IsNumber, IsNotEmpty, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateStepDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  step_order: number;

  @ApiProperty({ example: 0, description: "Delay in minutes (0 = immediate)" })
  @IsNumber()
  @Min(0)
  delay_minutes: number;

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
}

export class UpdateStepDto {
  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @Min(1)
  step_order?: number;

  @ApiProperty({ example: 1440, required: false })
  @IsNumber()
  @Min(0)
  delay_minutes?: number;

  @ApiProperty({ example: "Welcome to {{user.name}}!", required: false })
  @IsString()
  subject_template?: string;

  @ApiProperty({ example: "<h1>Hello {{user.name}}</h1>", required: false })
  @IsString()
  body_template?: string;
}
