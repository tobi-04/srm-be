import { IsNumber, IsBoolean, Min, Max, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateWithdrawalConfigDto {
  @ApiProperty({
    description: "Minimum withdrawal amount (VND)",
    example: 100000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  min_withdrawal_amount?: number;

  @ApiProperty({
    description: "Fee rate percentage (0-100)",
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  fee_rate?: number;

  @ApiProperty({
    description: "Whether withdrawals are enabled",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    description: "Start day of month for withdrawal period (1-31)",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(31)
  withdrawal_start_day?: number;

  @ApiProperty({
    description: "End day of month for withdrawal period (1-31)",
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(31)
  withdrawal_end_day?: number;
}
