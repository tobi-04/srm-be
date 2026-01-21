import { IsNumber, Min, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateWithdrawalRequestDto {
  @ApiProperty({
    description: "Amount to withdraw (before fee)",
    example: 500000,
    minimum: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;
}
