import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IndicatorStoreService } from "./indicator-store.service";
import { SubscriptionService } from "./subscription.service";
import { CreateIndicatorDto, UpdateIndicatorDto } from "./dto/indicator.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";

@ApiTags("admin/indicators")
@Controller("admin/indicators")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminIndicatorController {
  constructor(
    private readonly indicatorService: IndicatorStoreService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new indicator" })
  async create(@Body() createIndicatorDto: CreateIndicatorDto) {
    return this.indicatorService.create(createIndicatorDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all indicators (admin)" })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.indicatorService.findAll(paginationDto, {}, true);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "Get all subscriptions (admin)" })
  async getSubscriptions(@Query("page") page = 1, @Query("limit") limit = 10) {
    return this.subscriptionService.adminGetSubscriptions(
      Number(page),
      Number(limit),
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get indicator by ID (admin)" })
  async findOne(@Param("id") id: string) {
    return this.indicatorService.findOne(id, true);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update indicator" })
  async update(
    @Param("id") id: string,
    @Body() updateIndicatorDto: UpdateIndicatorDto,
  ) {
    return this.indicatorService.update(id, updateIndicatorDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete indicator" })
  async remove(@Param("id") id: string) {
    return this.indicatorService.delete(id);
  }
}
