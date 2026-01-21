import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { SalerService } from "./saler.service";
import { SalerOrdersQuery } from "./dto/saler-orders-query.dto";
import {
  SalerDashboardResponse,
  SalerCoursesResponse,
} from "./dto/saler-response.dto";
import { SalerStudentsQuery } from "./dto/saler-students-query.dto";
import { SalerKPIResponse } from "../saler-kpi/dto/kpi-response.dto";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto";

@ApiTags("Saler Dashboard")
@ApiBearerAuth()
@Controller("saler")
@UseGuards(JwtAccessGuard)
export class SalerController {
  constructor(private readonly salerService: SalerService) {}

  @Get("dashboard/overview")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get saler dashboard overview" })
  @ApiResponse({
    status: 200,
    description: "Dashboard data with stats and chart",
    type: SalerDashboardResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getDashboard(
    @Req() req: any,
    @Query("days") days?: string,
  ): Promise<SalerDashboardResponse> {
    const salerId = req.user.userId; // Extract from JWT
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.salerService.getDashboardOverview(salerId, daysNum);
  }

  @Get("orders")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get saler orders with pagination and filtering" })
  @ApiResponse({
    status: 200,
    description: "Paginated orders",
  })
  @HttpCode(HttpStatus.OK)
  async getOrders(@Req() req: any, @Query() query: SalerOrdersQuery) {
    const salerId = req.user.userId; // Extract from JWT
    return this.salerService.getOrders(salerId, query);
  }

  @Get("courses")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get assigned courses with referral links" })
  @ApiResponse({
    status: 200,
    description: "Assigned courses with referral links",
    type: SalerCoursesResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getCourses(@Req() req: any): Promise<SalerCoursesResponse> {
    const salerId = req.user.userId; // Extract from JWT
    return this.salerService.getCourses(salerId);
  }

  @Get("commissions")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get commissions with pagination" })
  @ApiResponse({
    status: 200,
    description: "Paginated commissions",
  })
  @HttpCode(HttpStatus.OK)
  async getCommissions(@Req() req: any, @Query() query: any) {
    const salerId = req.user.userId; // Extract from JWT
    return this.salerService.getCommissions(salerId, query);
  }

  @Get("commissions/summary")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get commission summary by status" })
  @ApiResponse({
    status: 200,
    description: "Commission summary",
  })
  @HttpCode(HttpStatus.OK)
  async getCommissionSummary(@Req() req: any) {
    const salerId = req.user.userId; // Extract from JWT
    return this.salerService.getCommissionSummary(salerId);
  }

  @Get("kpi")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get saler KPI for a period" })
  @ApiResponse({
    status: 200,
    description: "KPI data",
    type: SalerKPIResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getKPI(@Req() req: any, @Query("period") period?: string) {
    const salerId = req.user.userId;
    return this.salerService.getKPI(salerId, period);
  }

  @Get("students")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get students referred by saler" })
  @ApiResponse({
    status: 200,
    description: "List of students",
  })
  @HttpCode(HttpStatus.OK)
  async getStudents(@Req() req: any, @Query() query: SalerStudentsQuery) {
    const salerId = req.user.userId;
    return this.salerService.getStudents(salerId, query);
  }

  @Get("bank-account")
  @ApiOperation({ summary: "Get saler bank account information" })
  @ApiResponse({
    status: 200,
    description: "Bank account information",
  })
  @HttpCode(HttpStatus.OK)
  async getBankAccount(@Req() req: any) {
    const salerId = req.user.userId;
    return this.salerService.getBankAccount(salerId);
  }

  @Put("bank-account")
  @ApiOperation({ summary: "Update saler bank account information" })
  @ApiResponse({
    status: 200,
    description: "Bank account updated successfully",
  })
  @HttpCode(HttpStatus.OK)
  async updateBankAccount(@Req() req: any, @Body() dto: UpdateBankAccountDto) {
    const salerId = req.user.userId;
    return this.salerService.updateBankAccount(salerId, dto);
  }
}
