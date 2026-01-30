import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBookOrderDto {
  @ApiProperty({ description: "Book ID to purchase" })
  @IsString()
  @IsNotEmpty()
  book_id: string;

  // Fields for checkout form (similar to course landing page)
  @ApiProperty({ description: "Customer name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Customer email" })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: "Customer phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "Optional discount coupon code" })
  @IsOptional()
  @IsString()
  coupon_code?: string;
}
