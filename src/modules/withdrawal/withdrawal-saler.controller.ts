import {
  Controller,
  Get,
  Post,
  Body,
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
import { WithdrawalService } from "./withdrawal.service";
import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";

@ApiTags("Saler Withdrawals")
@ApiBearerAuth()
@Controller("saler/withdrawals")
@UseGuards(JwtAccessGuard)
export class WithdrawalSalerController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get("config")
  @ApiOperation({ summary: "Get withdrawal config for display" })
  @HttpCode(HttpStatus.OK)
  async getConfig() {
    const config = await this.withdrawalService.getConfig();
    return {
      min_withdrawal_amount: config.min_withdrawal_amount,
      fee_rate: config.fee_rate,
      is_active: config.is_active,
    };
  }

  @Post()
  @ApiOperation({ summary: "Create a withdrawal request" })
  @ApiResponse({ status: 201, description: "Withdrawal request created" })
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Req() req: any,
    @Body() dto: CreateWithdrawalRequestDto,
  ) {
    const salerId = req.user.userId;
    return this.withdrawalService.createRequest(salerId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get my withdrawal requests" })
  @ApiResponse({ status: 200, description: "List of withdrawal requests" })
  @HttpCode(HttpStatus.OK)
  async getMyRequests(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const salerId = req.user.userId;
    return this.withdrawalService.getRequestsBySaler(
      salerId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
