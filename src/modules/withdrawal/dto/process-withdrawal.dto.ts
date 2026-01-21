import { IsString, IsOptional, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ProcessWithdrawalDto {
  @ApiProperty({
    description: "New status for the withdrawal request",
    enum: ["approved", "rejected"],
  })
  @IsString()
  @IsIn(["approved", "rejected"])
  status: "approved" | "rejected";

  @ApiProperty({
    description: "Reason for rejection (required if rejected)",
    example: "Invalid bank information",
    required: false,
  })
  @IsString()
  @IsOptional()
  reject_reason?: string;
}
