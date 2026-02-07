import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
} from "class-validator";
import {
  Coupon,
  CouponDocument,
  CouponType,
  ApplicableResourceType,
} from "../book-store/entities/coupon.entity";

class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  resource_type: string;

  @IsString()
  @IsOptional()
  resource_id?: string;

  @IsNumber()
  @IsNotEmpty()
  original_price: number;

  @IsNumber()
  @IsOptional()
  default_discount?: number;
}

@ApiTags("coupons")
@Controller("coupons")
export class CouponController {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate a coupon code" })
  @ApiResponse({ status: 200, description: "Coupon validation result" })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    const {
      code,
      resource_type,
      original_price: price,
      default_discount = 0,
    } = dto;

    // Find coupon
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
    });

    if (!coupon) {
      throw new BadRequestException("Mã giảm giá không tồn tại");
    }

    // Check if active
    if (!coupon.is_active) {
      throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new BadRequestException("Mã giảm giá đã hết hạn");
    }

    // Check usage limit
    if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
      throw new BadRequestException("Mã giảm giá đã hết lượt sử dụng");
    }

    // Check if applicable to this resource type
    const resourceTypeUpper = resource_type.toUpperCase();
    const isApplicable =
      coupon.applicable_to.includes(ApplicableResourceType.ALL) ||
      coupon.applicable_to.includes(
        resourceTypeUpper as ApplicableResourceType,
      );

    if (!isApplicable) {
      throw new BadRequestException(
        `Mã giảm giá không áp dụng cho ${resource_type.toLowerCase()}`,
      );
    }

    // Calculate discount (Option A: apply default first, then coupon on discounted price)
    const priceAfterDefault = price - default_discount;
    let couponDiscountAmount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      couponDiscountAmount = Math.floor(
        priceAfterDefault * (coupon.value / 100),
      );
    } else {
      couponDiscountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed price
    couponDiscountAmount = Math.min(couponDiscountAmount, priceAfterDefault);

    const finalPrice = Math.max(0, priceAfterDefault - couponDiscountAmount);

    return {
      valid: true,
      coupon_id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount_amount: couponDiscountAmount,
      price_after_default: priceAfterDefault,
      final_price: finalPrice,
      total_savings: default_discount + couponDiscountAmount,
    };
  }
}
