import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { WithdrawalService } from "./withdrawal.service";
import { UpdateWithdrawalConfigDto } from "./dto/update-withdrawal-config.dto";
import { ProcessWithdrawalDto } from "./dto/process-withdrawal.dto";
import { WithdrawalStatus } from "./entities/withdrawal-request.entity";

@ApiTags("Admin Withdrawals")
@ApiBearerAuth()
@Controller("admin/withdrawals")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles("admin")
export class WithdrawalAdminController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get("config")
  @ApiOperation({ summary: "Get withdrawal configuration" })
  @HttpCode(HttpStatus.OK)
  async getConfig() {
    return this.withdrawalService.getConfig();
  }

  @Put("config")
  @ApiOperation({ summary: "Update withdrawal configuration" })
  @ApiResponse({ status: 200, description: "Config updated" })
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Req() req: any, @Body() dto: UpdateWithdrawalConfigDto) {
    const adminId = req.user.userId;
    return this.withdrawalService.updateConfig(adminId, dto);
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get withdrawal statistics" })
  @HttpCode(HttpStatus.OK)
  async getStatistics() {
    return this.withdrawalService.getStatistics();
  }

  @Get()
  @ApiOperation({ summary: "Get all withdrawal requests" })
  @ApiResponse({ status: 200, description: "List of withdrawal requests" })
  @HttpCode(HttpStatus.OK)
  async getAllRequests(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: WithdrawalStatus,
  ) {
    return this.withdrawalService.getAllRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Put(":id/process")
  @ApiOperation({ summary: "Process withdrawal request (approve/reject)" })
  @ApiResponse({ status: 200, description: "Request processed" })
  @HttpCode(HttpStatus.OK)
  async processRequest(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: ProcessWithdrawalDto,
  ) {
    const adminId = req.user.userId;
    return this.withdrawalService.processRequest(id, adminId, dto);
  }
}
