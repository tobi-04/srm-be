import {
  IsString,
  IsEnum,
  IsObject,
  IsArray,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, PartialType } from "@nestjs/swagger";
import { LandingPageStatus } from "../entities/landing-page.entity";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { IntersectionType } from "@nestjs/swagger";

class FormFieldDto {
  @ApiProperty({ example: "fullname" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Full Name" })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: "text",
    enum: ["text", "email", "tel", "textarea", "select"],
  })
  @IsEnum(["text", "email", "tel", "textarea", "select"])
  type: "text" | "email" | "tel" | "textarea" | "select";

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ example: "Enter your full name", required: false })
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiProperty({ example: ["Option 1", "Option 2"], required: false })
  @IsArray()
  @IsOptional()
  options?: string[];
}

class PaymentConfigDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sepay_account_number?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sepay_account_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sepay_bank_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sepay_bank_code?: string;
}

class MetadataDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  primary_color?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  button_text?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  success_message?: string;
}

export class CreateLandingPageDto {
  @ApiProperty({ example: "course", enum: ["course", "book", "indicator"] })
  @IsString()
  @IsOptional()
  resource_type?: string;

  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsString()
  @IsOptional()
  course_id?: string;

  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsString()
  @IsOptional()
  book_id?: string;

  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsString()
  @IsOptional()
  indicator_id?: string;

  @ApiProperty({ example: "Web Development Course Landing Page" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "web-dev-course" })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: "draft", enum: LandingPageStatus })
  @IsEnum(LandingPageStatus)
  @IsOptional()
  status?: LandingPageStatus;

  @ApiProperty({
    example: {},
    required: false,
    description: "Legacy field - Craft.js page structure",
  })
  @IsObject()
  @IsOptional()
  page_content?: Record<string, any>;

  @ApiProperty({
    example: {},
    required: false,
    description: "Step 1: User Information Form - Craft.js page structure",
  })
  @IsObject()
  @IsOptional()
  page_1_content?: Record<string, any>;

  @ApiProperty({
    example: {},
    required: false,
    description: "Step 2: Sales Page - Craft.js page structure",
  })
  @IsObject()
  @IsOptional()
  page_2_content?: Record<string, any>;

  @ApiProperty({
    example: {},
    required: false,
    description: "Step 3: Payment Page - Craft.js page structure",
  })
  @IsObject()
  @IsOptional()
  page_3_content?: Record<string, any>;

  @ApiProperty({ type: [FormFieldDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  @IsOptional()
  form_fields?: FormFieldDto[];

  @ApiProperty({ type: PaymentConfigDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentConfigDto)
  @IsOptional()
  payment_config?: PaymentConfigDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email_template?: string;

  @ApiProperty({ type: MetadataDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => MetadataDto)
  @IsOptional()
  metadata?: MetadataDto;
}

export class UpdateLandingPageDto extends PartialType(CreateLandingPageDto) {}

export class SearchLandingPageDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  course_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  book_id?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  indicator_id?: string;

  @ApiProperty({ required: false, enum: LandingPageStatus })
  @IsEnum(LandingPageStatus)
  @IsOptional()
  @IsOptional()
  status?: LandingPageStatus;
}

export class GetLandingPagesDto extends IntersectionType(
  PaginationDto,
  SearchLandingPageDto,
) {}
