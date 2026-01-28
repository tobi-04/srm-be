import { IsString, IsEmail, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO cho việc thuê Indicator
 * Tương tự CreateBookOrderDto
 */
export class CreateSubscriptionDto {
  @ApiProperty({
    description: "Indicator ID to subscribe",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  indicator_id: string;

  @ApiProperty({
    description: "Customer name",
    example: "Nguyễn Văn A",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Customer email",
    example: "customer@example.com",
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: "Customer phone",
    example: "0901234567",
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: "Enable auto-renew",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;
}
