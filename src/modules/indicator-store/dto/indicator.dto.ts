import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IndicatorStatus } from "../entities/indicator.entity";

export class CreateIndicatorDto {
  @ApiProperty({
    description: "Indicator name",
    example: "Premium Trading Signals",
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    description: "Indicator description (public)",
    example: "Get daily trading signals from our expert team",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Monthly subscription price (VND)",
    example: 500000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_monthly: number;

  @ApiPropertyOptional({
    description: "Indicator status",
    enum: IndicatorStatus,
    default: IndicatorStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(IndicatorStatus)
  status?: IndicatorStatus;

  @ApiPropertyOptional({
    description: "Cover image URL",
  })
  @IsOptional()
  @IsString()
  cover_image?: string;

  // Contact info - hidden until paid
  @ApiPropertyOptional({
    description: "Owner/Provider name",
  })
  @IsOptional()
  @IsString()
  owner_name?: string;

  @ApiPropertyOptional({
    description: "Contact email",
  })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({
    description: "Contact Telegram",
  })
  @IsOptional()
  @IsString()
  contact_telegram?: string;

  @ApiPropertyOptional({
    description: "Detailed description (hidden until paid)",
  })
  @IsOptional()
  @IsString()
  description_detail?: string;
}

export class UpdateIndicatorDto {
  @ApiPropertyOptional({
    description: "Indicator name",
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({
    description: "Indicator description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Monthly subscription price (VND)",
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_monthly?: number;

  @ApiPropertyOptional({
    description: "Indicator status",
    enum: IndicatorStatus,
  })
  @IsOptional()
  @IsEnum(IndicatorStatus)
  status?: IndicatorStatus;

  @ApiPropertyOptional({
    description: "Cover image URL",
  })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiPropertyOptional({
    description: "Owner/Provider name",
  })
  @IsOptional()
  @IsString()
  owner_name?: string;

  @ApiPropertyOptional({
    description: "Contact email",
  })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({
    description: "Contact Telegram",
  })
  @IsOptional()
  @IsString()
  contact_telegram?: string;

  @ApiPropertyOptional({
    description: "Detailed description",
  })
  @IsOptional()
  @IsString()
  description_detail?: string;
}

export class SearchIndicatorDto {
  @ApiPropertyOptional({
    description: "Search query for name or description",
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: IndicatorStatus,
  })
  @IsOptional()
  @IsEnum(IndicatorStatus)
  status?: IndicatorStatus;
}
