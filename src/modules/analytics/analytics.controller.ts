import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";

@Controller("analytics")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard/summary")
  async getSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get("dashboard/revenue-trend")
  async getRevenueTrend(@Query("days") days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.analyticsService.getRevenueTrend(daysNum);
  }

  @Get("dashboard/traffic-sources")
  async getTrafficSourceStats() {
    return this.analyticsService.getTrafficSourceStats();
  }

  @Get("dashboard/recent-payments")
  async getRecentPayments() {
    return this.analyticsService.getRecentPayments();
  }

  @Get("dashboard/daily-sales")
  async getDailySalesSnapshot(@Query("days") days?: string) {
    const daysNum = days ? parseInt(days) : 14;
    return this.analyticsService.getDailySalesSnapshot(daysNum);
  }

  @Get("dashboard/weekly-sales")
  async getWeeklySalesSnapshot(@Query("weeks") weeks?: string) {
    const weeksNum = weeks ? parseInt(weeks) : 4;
    return this.analyticsService.getWeeklySalesSnapshot(weeksNum);
  }

  @Get("student-progress/summary")
  async getProgressSummary() {
    return this.analyticsService.getProgressSummary();
  }

  @Get("student-progress")
  async getStudentProgress(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.analyticsService.getStudentProgressPaginated({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      status,
    });
  }
}
