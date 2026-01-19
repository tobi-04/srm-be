import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsIP,
  IsUrl,
  IsDateString,
} from "class-validator";

export class CreateTrafficSourceDto {
  @IsString()
  @IsOptional()
  utm_source?: string;

  @IsString()
  @IsOptional()
  utm_medium?: string;

  @IsString()
  @IsOptional()
  utm_campaign?: string;

  @IsString()
  @IsOptional()
  utm_content?: string;

  @IsString()
  @IsOptional()
  utm_term?: string;

  @IsString()
  @IsNotEmpty()
  landing_page: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsDateString()
  @IsOptional()
  first_visit_at?: string;

  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
}

export class TrafficSourceAnalyticsQueryDto {
  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  utm_source?: string;

  @IsString()
  @IsOptional()
  utm_campaign?: string;
}
