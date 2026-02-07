import { IsString, IsNumber, IsNotEmpty, IsMongoId, IsOptional } from "class-validator";

export class CreatePaymentTransactionDto {
  @IsMongoId()
  @IsNotEmpty()
  course_id: string;

  @IsString()
  @IsNotEmpty()
  user_submission_id: string;

  @IsNumber()
  @IsNotEmpty()
  course_price: number;

  @IsString()
  @IsOptional()
  coupon_code?: string;
}
