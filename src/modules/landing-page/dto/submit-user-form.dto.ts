import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class TrafficSourceDto {
  @IsOptional()
  @IsString()
  utm_source?: string;

  @IsOptional()
  @IsString()
  utm_medium?: string;

  @IsOptional()
  @IsString()
  utm_campaign?: string;

  @IsOptional()
  @IsString()
  utm_content?: string;

  @IsOptional()
  @IsString()
  utm_term?: string;

  @IsOptional()
  @IsString()
  landing_page?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  session_id?: string;
}

export class SubmitUserFormDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  // UTM Tracking data
  @IsOptional()
  @ValidateNested()
  @Type(() => TrafficSourceDto)
  traffic_source?: TrafficSourceDto;

  @IsOptional()
  @IsString()
  session_id?: string;
}
