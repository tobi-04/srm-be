import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Coupon, CouponDocument } from "./entities/coupon.entity";
import { CreateCouponDto, UpdateCouponDto } from "./dto/coupon.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("admin-coupons")
@Controller("admin/books/coupons")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class CouponAdminController {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new coupon" })
  async create(@Body() createCouponDto: CreateCouponDto) {
    // Ensure code is uppercase
    createCouponDto.code = createCouponDto.code.toUpperCase();
    const coupon = new this.couponModel(createCouponDto);
    return coupon.save();
  }

  @Get()
  @ApiOperation({ summary: "Get all coupons with pagination" })
  async findAll(@Query() paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.couponModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.couponModel.countDocuments().exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get coupon by ID" })
  async findOne(@Param("id") id: string) {
    return this.couponModel.findById(id).exec();
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a coupon" })
  async update(
    @Param("id") id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    if (updateCouponDto.code) {
      updateCouponDto.code = updateCouponDto.code.toUpperCase();
    }
    return this.couponModel
      .findByIdAndUpdate(id, updateCouponDto, { new: true })
      .exec();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a coupon" })
  async remove(@Param("id") id: string) {
    await this.couponModel.findByIdAndDelete(id).exec();
  }
}
