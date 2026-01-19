import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Ip,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { TrafficSourceService } from "./traffic-source.service";
import {
  CreateTrafficSourceDto,
  TrafficSourceAnalyticsQueryDto,
} from "./dto/traffic-source.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";

@Controller("traffic-sources")
export class TrafficSourceController {
  constructor(private readonly trafficSourceService: TrafficSourceService) {}

  /**
   * Create a new traffic source - PUBLIC endpoint
   * Called by frontend when user first visits with UTM params
   */
  @Post()
  async create(
    @Body() createTrafficSourceDto: CreateTrafficSourceDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ) {
    // Automatically add IP and user agent if not provided
    if (!createTrafficSourceDto.ip_address) {
      createTrafficSourceDto.ip_address = ip;
    }
    if (!createTrafficSourceDto.user_agent) {
      createTrafficSourceDto.user_agent = userAgent;
    }

    return this.trafficSourceService.create(createTrafficSourceDto);
  }

  /**
   * Get traffic source by ID - Admin only
   */
  @Get(":id")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findById(@Param("id") id: string) {
    return this.trafficSourceService.findById(id);
  }

  /**
   * Get traffic source by session ID - PUBLIC endpoint
   */
  @Get("session/:sessionId")
  async findBySessionId(@Param("sessionId") sessionId: string) {
    return this.trafficSourceService.findBySessionId(sessionId);
  }

  /**
   * Get analytics by source - Admin only
   */
  @Get("analytics/by-source")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAnalyticsBySource(@Query() query: TrafficSourceAnalyticsQueryDto) {
    return this.trafficSourceService.getAnalyticsBySource(query);
  }

  /**
   * Get analytics by campaign - Admin only
   */
  @Get("analytics/by-campaign")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAnalyticsByCampaign(@Query() query: TrafficSourceAnalyticsQueryDto) {
    return this.trafficSourceService.getAnalyticsByCampaign(query);
  }

  /**
   * Get funnel statistics - Admin only
   */
  @Get("analytics/funnel")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getFunnelStats(@Query() query: TrafficSourceAnalyticsQueryDto) {
    return this.trafficSourceService.getFunnelStats(query);
  }
}
