import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Action performed (CREATE, UPDATE, DELETE, READ, etc.)',
    example: 'CREATE'
  })
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Entity name',
    example: 'User'
  })
  @IsString()
  entity: string;

  @ApiPropertyOptional({
    description: 'ID of the affected entity',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  entity_id?: Types.ObjectId;

  @ApiPropertyOptional({
    description: 'ID of the user who performed the action',
    example: '507f1f77bcf86cd799439012'
  })
  @IsOptional()
  user_id?: Types.ObjectId;

  @ApiPropertyOptional({
    description: 'Previous state of the entity (for updates/deletes)',
    example: { name: 'Old Name', email: 'old@example.com' }
  })
  @IsOptional()
  @IsObject()
  old_data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'New state of the entity (for creates/updates)',
    example: { name: 'New Name', email: 'new@example.com' }
  })
  @IsOptional()
  @IsObject()
  new_data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'IP address of the client',
    example: '192.168.1.1'
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Additional custom metadata',
    example: { payment_method: 'credit_card', transaction_id: 'tx_12345' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class FilterAuditLogDto {
  @ApiPropertyOptional({
    description: 'Filter by action type',
    example: 'CREATE'
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity name',
    example: 'User'
  })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: '507f1f77bcf86cd799439011'
  })
  @IsOptional()
  @IsString()
  entity_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '507f1f77bcf86cd799439012'
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filter from this date (ISO 8601 format)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Filter until this date (ISO 8601 format)',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by IP address',
    example: '192.168.1.1'
  })
  @IsOptional()
  @IsString()
  ip_address?: string;
}
