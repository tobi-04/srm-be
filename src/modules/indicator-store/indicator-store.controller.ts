import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IndicatorStoreService } from "./indicator-store.service";
import { SubscriptionService } from "./subscription.service";
import { CreateSubscriptionDto } from "./dto/subscription.dto";
import { SearchIndicatorDto } from "./dto/indicator.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

@ApiTags("indicators")
@Controller("indicators")
export class IndicatorStoreController {
  constructor(
    private readonly indicatorService: IndicatorStoreService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all active indicators" })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.indicatorService.findAll(paginationDto, {}, false);
  }

  @Get("my-subscriptions")
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's subscriptions" })
  async getMySubscriptions(@Request() req: any) {
    return this.subscriptionService.getMySubscriptions(
      req.user.sub || req.user._id,
    );
  }

  @Get(":slug")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get indicator by slug" })
  async findBySlug(@Param("slug") slug: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?._id;
    return this.indicatorService.findBySlugWithContact(slug, userId);
  }

  @Post("subscribe")
  @ApiOperation({ summary: "Subscribe to an indicator" })
  async subscribe(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.subscribe(createSubscriptionDto);
  }

  @Get("subscription-status/:id")
  @ApiOperation({ summary: "Check subscription status" })
  async getSubscriptionStatus(@Param("id") id: string) {
    return this.subscriptionService.getSubscriptionStatus(id);
  }

  @Delete("subscription/:id")
  @ApiOperation({ summary: "Cancel a pending subscription" })
  async cancelSubscription(@Param("id") id: string) {
    return this.subscriptionService.cancelSubscription(id);
  }
}
