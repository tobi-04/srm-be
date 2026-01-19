import { IsString, IsNumber, IsOptional, IsNotEmpty } from "class-validator";

export class SepayWebhookDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsOptional()
  gateway: string;

  @IsString()
  @IsOptional()
  transactionDate: string;

  @IsString()
  @IsOptional()
  accountNumber: string;

  @IsString()
  @IsOptional()
  code: string;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  transferType: string;

  @IsNumber()
  @IsOptional()
  transferAmount: number;

  @IsNumber()
  @IsOptional()
  accumulated: number;

  @IsString()
  @IsOptional()
  subAccount: string;

  @IsString()
  @IsOptional()
  referenceCode: string;

  @IsString()
  @IsOptional()
  description: string;
}
