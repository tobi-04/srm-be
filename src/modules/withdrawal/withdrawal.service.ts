import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatus,
} from "./entities/withdrawal-request.entity";
import {
  WithdrawalConfig,
  WithdrawalConfigDocument,
} from "./entities/withdrawal-config.entity";
import { CreateWithdrawalRequestDto } from "./dto/create-withdrawal-request.dto";
import { UpdateWithdrawalConfigDto } from "./dto/update-withdrawal-config.dto";
import { ProcessWithdrawalDto } from "./dto/process-withdrawal.dto";
import { CommissionService } from "../commission/commission.service";
import {
  SalerDetails,
  SalerDetailsDocument,
} from "../saler-details/entities/saler-details.entity";

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectModel(WithdrawalRequest.name)
    private withdrawalRequestModel: Model<WithdrawalRequestDocument>,
    @InjectModel(WithdrawalConfig.name)
    private withdrawalConfigModel: Model<WithdrawalConfigDocument>,
    @InjectModel(SalerDetails.name)
    private salerDetailsModel: Model<SalerDetailsDocument>,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Get or create withdrawal config (singleton)
   */
  async getConfig(): Promise<WithdrawalConfig> {
    let config = await this.withdrawalConfigModel.findOne({
      is_deleted: false,
    });

    if (!config) {
      // Create default config
      config = await this.withdrawalConfigModel.create({
        min_withdrawal_amount: 100000,
        fee_rate: 5,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return config;
  }

  /**
   * Update withdrawal config
   */
  async updateConfig(
    adminId: string,
    dto: UpdateWithdrawalConfigDto,
  ): Promise<WithdrawalConfig> {
    const config = await this.getConfig();

    const updateData: any = {
      updated_by: adminId,
      updated_at: new Date(),
    };

    if (dto.min_withdrawal_amount !== undefined) {
      updateData.min_withdrawal_amount = dto.min_withdrawal_amount;
    }
    if (dto.fee_rate !== undefined) {
      updateData.fee_rate = dto.fee_rate;
    }
    if (dto.is_active !== undefined) {
      updateData.is_active = dto.is_active;
    }

    const updated = await this.withdrawalConfigModel.findByIdAndUpdate(
      config._id,
      { $set: updateData },
      { new: true },
    );

    return updated!;
  }

  /**
   * Create withdrawal request by saler
   */
  async createRequest(
    salerId: string,
    dto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {
    // Get config
    const config = await this.getConfig();

    if (!config.is_active) {
      throw new BadRequestException("Chức năng rút tiền đang tạm dừng");
    }

    // Check minimum amount
    if (dto.amount < config.min_withdrawal_amount) {
      throw new BadRequestException(
        `Số tiền rút tối thiểu là ${config.min_withdrawal_amount.toLocaleString("vi-VN")}đ`,
      );
    }

    // Get saler's available balance
    const summary = await this.commissionService.getSummaryBySalerId(salerId);
    const availableBalance = summary.available.total;

    if (dto.amount > availableBalance) {
      throw new BadRequestException(
        `Số dư khả dụng không đủ. Số dư hiện tại: ${availableBalance.toLocaleString("vi-VN")}đ`,
      );
    }

    // Check if saler has bank account
    const salerDetails = await this.salerDetailsModel
      .findOne({ user_id: salerId, is_deleted: false })
      .lean();

    if (!salerDetails?.bank_account) {
      throw new BadRequestException(
        "Vui lòng cập nhật thông tin tài khoản ngân hàng trước khi rút tiền",
      );
    }

    // Check for pending requests
    const pendingRequest = await this.withdrawalRequestModel.findOne({
      user_id: salerId,
      status: WithdrawalStatus.PENDING,
      is_deleted: false,
    });

    if (pendingRequest) {
      throw new BadRequestException(
        "Bạn đã có yêu cầu rút tiền đang chờ xử lý",
      );
    }

    // Calculate fee and net amount
    const feeAmount = Math.round((dto.amount * config.fee_rate) / 100);
    const netAmount = dto.amount - feeAmount;

    // Create request
    const request = await this.withdrawalRequestModel.create({
      user_id: salerId,
      amount: dto.amount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      fee_rate: config.fee_rate,
      status: WithdrawalStatus.PENDING,
      bank_account: salerDetails.bank_account,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return request;
  }

  /**
   * Get withdrawal requests by saler
   */
  async getRequestsBySaler(
    salerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.withdrawalRequestModel
        .find({ user_id: salerId, is_deleted: false })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.withdrawalRequestModel.countDocuments({
        user_id: salerId,
        is_deleted: false,
      }),
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

  /**
   * Get all withdrawal requests (admin)
   */
  async getAllRequests(
    page: number = 1,
    limit: number = 20,
    status?: WithdrawalStatus,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = { is_deleted: false };

    if (status) {
      filter.status = status;
    }

    const [data, total] = await Promise.all([
      this.withdrawalRequestModel
        .find(filter)
        .populate("user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.withdrawalRequestModel.countDocuments(filter),
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

  /**
   * Process withdrawal request (admin approve/reject)
   */
  async processRequest(
    requestId: string,
    adminId: string,
    dto: ProcessWithdrawalDto,
  ) {
    const request = await this.withdrawalRequestModel.findOne({
      _id: requestId,
      is_deleted: false,
    });

    if (!request) {
      throw new NotFoundException("Yêu cầu rút tiền không tồn tại");
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException("Yêu cầu này đã được xử lý");
    }

    if (dto.status === "rejected" && !dto.reject_reason) {
      throw new BadRequestException("Vui lý do từ chối là bắt buộc");
    }

    const updateData: any = {
      status:
        dto.status === "approved"
          ? WithdrawalStatus.APPROVED
          : WithdrawalStatus.REJECTED,
      processed_by: adminId,
      processed_at: new Date(),
      updated_at: new Date(),
    };

    if (dto.status === "rejected") {
      updateData.reject_reason = dto.reject_reason;
    }

    // If approved, mark commissions as paid
    if (dto.status === "approved") {
      await this.commissionService.markAsPaidBySalerId(
        request.user_id,
        request.amount,
      );
    }

    const updated = await this.withdrawalRequestModel.findByIdAndUpdate(
      requestId,
      { $set: updateData },
      { new: true },
    );

    return updated;
  }

  /**
   * Get withdrawal statistics (admin)
   */
  async getStatistics() {
    const [pending, approved, rejected, totalPaid] = await Promise.all([
      this.withdrawalRequestModel.countDocuments({
        status: WithdrawalStatus.PENDING,
        is_deleted: false,
      }),
      this.withdrawalRequestModel.countDocuments({
        status: WithdrawalStatus.APPROVED,
        is_deleted: false,
      }),
      this.withdrawalRequestModel.countDocuments({
        status: WithdrawalStatus.REJECTED,
        is_deleted: false,
      }),
      this.withdrawalRequestModel.aggregate([
        {
          $match: {
            status: WithdrawalStatus.APPROVED,
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$net_amount" },
          },
        },
      ]),
    ]);

    return {
      pending,
      approved,
      rejected,
      total_paid: totalPaid[0]?.total || 0,
    };
  }
}
