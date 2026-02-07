import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL = 'all',
  CUSTOM = 'custom',
}

export class GetReportsQueryDto {
  @ApiPropertyOptional({
    enum: TimeRange,
    default: TimeRange.MONTH,
    description: 'Khoảng thời gian lọc báo cáo',
  })
  @IsOptional()
  @IsEnum(TimeRange)
  range?: TimeRange = TimeRange.MONTH;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (dùng khi range=custom)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (dùng khi range=custom)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
