import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateAuditLogDto {
  @IsString()
  action: string;

  @IsString()
  entity: string;

  @IsOptional()
  entity_id?: Types.ObjectId;

  @IsOptional()
  user_id?: Types.ObjectId;

  @IsOptional()
  @IsObject()
  old_data?: Record<string, any>;

  @IsOptional()
  @IsObject()
  new_data?: Record<string, any>;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FilterAuditLogDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entity_id?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;
}
