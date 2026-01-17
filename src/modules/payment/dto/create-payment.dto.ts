import { IsNotEmpty, IsString, IsNumber, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty({ description: "User form submission ID" })
  @IsNotEmpty()
  @IsString()
  user_submission_id: string;

  @ApiProperty({ description: "Landing page ID" })
  @IsNotEmpty()
  @IsString()
  landing_page_id: string;

  @ApiProperty({ description: "Course price", example: 100000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  course_price: number;
}
