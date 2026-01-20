import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { CommissionRepository } from "./commission.repository";
import { CommissionStatus } from "./entities/commission.entity";
import { Order } from "../order/entities/order.entity";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  SalerDetails,
  SalerDetailsDocument,
} from "../saler-details/entities/saler-details.entity";

@Injectable()
export class CommissionService {
  constructor(
    private readonly commissionRepository: CommissionRepository,
    @InjectModel(SalerDetails.name)
    private salerDetailsModel: Model<SalerDetailsDocument>,
  ) {}

  /**
   * Create commission snapshot when order is paid
   * NOTE: This is called automatically via event listener
   */
  @OnEvent("order.paid")
  async createCommissionSnapshot(order: Order) {
    // Skip if no saler_id
    if (!order.saler_id) {
      return;
    }

    // Check if commission already exists
    const existingCommission = await this.commissionRepository.findByOrderId(
      order._id.toString(),
    );
    if (existingCommission) {
      return;
    }

    // Get saler details to find commission rate
    const salerDetails = await this.salerDetailsModel
      .findOne({ user_id: order.saler_id, is_deleted: false })
      .exec();

    if (!salerDetails) {
      console.error(`SalerDetails not found for saler_id: ${order.saler_id}`);
      return;
    }

    // Find commission rate for this course
    let commissionRate = salerDetails.default_commission_rate || 0;

    const courseCommission = salerDetails.course_commissions?.find(
      (cc) => cc.course_id.toString() === order.course_id.toString(),
    );

    if (courseCommission) {
      commissionRate = courseCommission.commission_rate;
    }

    // Create commission snapshot
    await this.commissionRepository.createSnapshot(order, commissionRate);
  }

  /**
   * Find commissions by saler ID
   */
  async findBySalerId(
    salerId: string,
    query: {
      page?: number;
      limit?: number;
      status?: CommissionStatus;
    },
  ) {
    return this.commissionRepository.findBySalerId(salerId, query);
  }

  /**
   * Get total commission by status
   */
  async getTotalByStatus(salerId: string, status: CommissionStatus) {
    return this.commissionRepository.sumBySalerIdAndStatus(salerId, status);
  }

  /**
   * Get commission summary grouped by status
   */
  async getSummaryBySalerId(salerId: string) {
    return this.commissionRepository.getSummaryBySalerId(salerId);
  }

  /**
   * Update commission status (e.g., for payout)
   */
  async updateStatus(
    commissionId: string,
    status: CommissionStatus,
    metadata?: any,
  ) {
    return this.commissionRepository.updateStatus(commissionId, status, {
      metadata,
    });
  }
}
