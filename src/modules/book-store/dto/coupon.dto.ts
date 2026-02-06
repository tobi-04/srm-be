import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsBoolean,
  IsDateString,
  MinLength,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CouponType, ApplicableResourceType } from "../entities/coupon.entity";

export class CreateCouponDto {
  @ApiProperty({
    description: "Coupon code",
    example: "SAVE10",
  })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({
    description: "Coupon type",
    enum: CouponType,
    default: CouponType.PERCENTAGE,
  })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({
    description: "Discount value (percentage or fixed amount)",
    example: 10,
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({
    description: "Resource types this coupon applies to",
    enum: ApplicableResourceType,
    isArray: true,
    example: [ApplicableResourceType.ALL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ApplicableResourceType, { each: true })
  applicable_to?: ApplicableResourceType[];

  @ApiPropertyOptional({
    description: "Expiry date",
    example: "2026-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    description: "Maximum number of times this coupon can be used",
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usage_limit?: number;

  @ApiPropertyOptional({
    description: "Manual override for active status",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ description: "Coupon code" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  code?: string;

  @ApiPropertyOptional({ description: "Coupon type", enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({ description: "Discount value" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({
    description: "Resource types this coupon applies to",
    enum: ApplicableResourceType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ApplicableResourceType, { each: true })
  applicable_to?: ApplicableResourceType[];

  @ApiPropertyOptional({ description: "Expiry date" })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ description: "Usage limit" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usage_limit?: number;

  @ApiPropertyOptional({ description: "Active status" })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ description: "Coupon code", example: "SAVE10" })
  @IsString()
  code: string;
}
