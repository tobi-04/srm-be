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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  created_by?: string;
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

  @ApiProperty({ required: false })
  @IsOptional()
  is_active?: boolean;
}
