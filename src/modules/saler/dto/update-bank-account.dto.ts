import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateBankAccountDto {
  @ApiProperty({
    description: "Tên chủ tài khoản",
    example: "NGUYEN VAN A",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  account_holder: string;

  @ApiProperty({
    description: "Số tài khoản ngân hàng",
    example: "1234567890",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(30)
  account_number: string;

  @ApiProperty({
    description: "Mã ngân hàng (VietQR code)",
    example: "MB",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  bank_code: string;

  @ApiProperty({
    description: "Tên ngân hàng",
    example: "Ngân hàng Quân đội",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bank_name: string;
}
