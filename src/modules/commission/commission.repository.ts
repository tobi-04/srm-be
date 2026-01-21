import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Commission,
  CommissionDocument,
  CommissionStatus,
} from "./entities/commission.entity";
import { Order } from "../order/entities/order.entity";

@Injectable()
export class CommissionRepository {
  constructor(
    @InjectModel(Commission.name)
    private commissionModel: Model<CommissionDocument>,
  ) {}

  /**
   * Find commissions by saler ID with pagination and filtering
   */
  async findBySalerId(
    salerId: string,
    query: {
      page?: number;
      limit?: number;
      status?: CommissionStatus;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      saler_id: new Types.ObjectId(salerId),
      is_deleted: false,
    };

    if (query.status) {
      filter.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.commissionModel
        .find(filter)
        .populate("order_id", "amount status paid_at")
        .populate("course_id", "title slug price")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.commissionModel.countDocuments(filter).exec(),
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
   * Sum commissions by saler ID and status
   */
  async sumBySalerIdAndStatus(
    salerId: string,
    status: CommissionStatus,
  ): Promise<number> {
    const result = await this.commissionModel
      .aggregate([
        {
          $match: {
            saler_id: new Types.ObjectId(salerId),
            status,
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$commission_amount" },
          },
        },
      ])
      .exec();

    return result[0]?.total || 0;
  }

  /**
   * Create commission snapshot for an order
   */
  async createSnapshot(
    order: Order,
    commissionRate: number,
  ): Promise<CommissionDocument> {
    const commissionAmount = (order.amount * commissionRate) / 100;

    const commission = new this.commissionModel({
      saler_id: order.saler_id,
      order_id: order._id,
      course_id: order.course_id,
      order_amount: order.amount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: CommissionStatus.AVAILABLE,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return commission.save();
  }

  /**
   * Find commission by order ID
   */
  async findByOrderId(orderId: string): Promise<CommissionDocument | null> {
    return this.commissionModel
      .findOne({ order_id: orderId, is_deleted: false })
      .exec();
  }

  /**
   * Update commission status
   */
  async updateStatus(
    commissionId: string,
    status: CommissionStatus,
    additionalData?: Partial<Commission>,
  ): Promise<CommissionDocument | null> {
    const updateData: any = { status, updated_at: new Date() };

    if (status === CommissionStatus.PAID) {
      updateData.paid_at = new Date();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    return this.commissionModel
      .findByIdAndUpdate(commissionId, updateData, { new: true })
      .exec();
  }

  /**
   * Get commission summary by status for a saler
   */
  async getSummaryBySalerId(salerId: string) {
    const result = await this.commissionModel
      .aggregate([
        {
          $match: {
            saler_id: new Types.ObjectId(salerId),
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$commission_amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const summary = {
      pending: { total: 0, count: 0 },
      available: { total: 0, count: 0 },
      paid: { total: 0, count: 0 },
    };

    result.forEach((item) => {
      if (item._id === CommissionStatus.PENDING) {
        summary.pending = { total: item.total, count: item.count };
      } else if (item._id === CommissionStatus.AVAILABLE) {
        summary.available = { total: item.total, count: item.count };
      } else if (item._id === CommissionStatus.PAID) {
        summary.paid = { total: item.total, count: item.count };
      }
    });

    return summary;
  }
}
