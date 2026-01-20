import {
  IsNumber,
  IsArray,
  IsString,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CourseCommissionDto {
  @ApiProperty({ description: "Course ID" })
  @IsString()
  course_id: string;

  @ApiProperty({
    description: "Commission rate (0-100%)",
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate: number;
}

export class UpdateKpiDto {
  @ApiPropertyOptional({ description: "Monthly KPI target", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kpi_monthly_target?: number;

  @ApiPropertyOptional({ description: "Quarterly KPI target", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kpi_quarterly_target?: number;

  @ApiPropertyOptional({ description: "Yearly KPI target", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kpi_yearly_target?: number;
}

export class AssignCoursesDto {
  @ApiProperty({ description: "Array of course IDs to assign", type: [String] })
  @IsArray()
  @IsString({ each: true })
  course_ids: string[];
}

export class UpdateCommissionsDto {
  @ApiPropertyOptional({
    description: "Default commission rate for unspecified courses (0-100%)",
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  default_commission_rate?: number;

  @ApiPropertyOptional({
    description: "Commission rates per course",
    type: [CourseCommissionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseCommissionDto)
  course_commissions?: CourseCommissionDto[];
}
