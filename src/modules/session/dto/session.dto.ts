import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PageVisitDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  @IsOptional()
  time_spent?: number;
}

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsString()
  @IsOptional()
  traffic_source_id?: string;

  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
}

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageVisitDto)
  @IsOptional()
  pages_visited?: PageVisitDto[];

  @IsNumber()
  @IsOptional()
  total_duration?: number;

  @IsOptional()
  is_converted?: boolean;
}

export class TrackPageVisitDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  @IsOptional()
  time_spent?: number;
}
