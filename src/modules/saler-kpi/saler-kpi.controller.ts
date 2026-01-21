import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SalerKPIService } from "./saler-kpi.service";

@ApiTags("Admin Saler KPI Analytics")
@ApiBearerAuth()
@Controller("admin/saler-kpi")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
export class SalerKPIController {
  constructor(private readonly salerKPIService: SalerKPIService) {}

  @Get("top")
  @ApiOperation({ summary: "Get top salers by KPI achievement" })
  @ApiQuery({
    name: "period",
    enum: ["month", "quarter", "year"],
    required: false,
  })
  @ApiQuery({ name: "limit", type: "number", required: false })
  @HttpCode(HttpStatus.OK)
  async getTopSalers(
    @Query("period") period?: "month" | "quarter" | "year",
    @Query("limit") limit?: string,
  ) {
    return this.salerKPIService.getTopSalers(
      period || "month",
      limit ? parseInt(limit, 10) : 3,
    );
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get overall KPI statistics" })
  @ApiQuery({
    name: "period",
    enum: ["month", "quarter", "year"],
    required: false,
  })
  @HttpCode(HttpStatus.OK)
  async getStatistics(@Query("period") period?: "month" | "quarter" | "year") {
    return this.salerKPIService.getKPIStatistics(period || "month");
  }

  @Get("chart")
  @ApiOperation({ summary: "Get KPI achievement chart data" })
  @ApiQuery({
    name: "period",
    enum: ["month", "quarter", "year"],
    required: false,
  })
  @ApiQuery({ name: "months", type: "number", required: false })
  @HttpCode(HttpStatus.OK)
  async getChart(
    @Query("period") period?: "month" | "quarter" | "year",
    @Query("months") months?: string,
  ) {
    return this.salerKPIService.getKPIChart(
      period || "month",
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get(":salerId/details")
  @ApiOperation({ summary: "Get detailed saler analytics" })
  @ApiQuery({
    name: "period",
    enum: ["month", "quarter", "year"],
    required: false,
  })
  @HttpCode(HttpStatus.OK)
  async getSalerDetails(
    @Param("salerId") salerId: string,
    @Query("period") period?: "month" | "quarter" | "year",
  ) {
    return this.salerKPIService.getSalerDetails(salerId, period || "month");
  }
}
