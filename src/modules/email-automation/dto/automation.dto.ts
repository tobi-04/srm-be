import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  EventType,
  TriggerType,
  TargetGroup,
  ScheduleType,
} from "../entities/email-automation.entity";

export class CreateAutomationDto {
  @ApiProperty({ example: "Welcome Email Sequence" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Send welcome emails to new users", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TriggerType, default: TriggerType.EVENT })
  @IsEnum(TriggerType)
  @IsOptional()
  trigger_type?: TriggerType;

  @ApiProperty({ enum: EventType, required: false })
  @IsEnum(EventType)
  @IsOptional()
  event_type?: EventType;

  @ApiProperty({ enum: TargetGroup, required: false })
  @IsEnum(TargetGroup)
  @IsOptional()
  target_group?: TargetGroup;

  @ApiProperty({ enum: ScheduleType, default: ScheduleType.ONCE })
  @IsEnum(ScheduleType)
  @IsOptional()
  schedule_type?: ScheduleType;

  @ApiProperty({ example: "0 9 * * *", required: false })
  @IsString()
  @IsOptional()
  cron_expression?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scheduled_at?: string;
}

export class UpdateAutomationDto {
  @ApiProperty({ example: "Welcome Email Sequence", required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: "Send welcome emails to new users", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TriggerType, required: false })
  @IsEnum(TriggerType)
  @IsOptional()
  trigger_type?: TriggerType;

  @ApiProperty({ enum: EventType, required: false })
  @IsEnum(EventType)
  @IsOptional()
  event_type?: EventType;

  @ApiProperty({ enum: TargetGroup, required: false })
  @IsEnum(TargetGroup)
  @IsOptional()
  target_group?: TargetGroup;

  @ApiProperty({ enum: ScheduleType, required: false })
  @IsEnum(ScheduleType)
  @IsOptional()
  schedule_type?: ScheduleType;

  @ApiProperty({ example: "0 9 * * *", required: false })
  @IsString()
  @IsOptional()
  cron_expression?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  scheduled_at?: string;
}
