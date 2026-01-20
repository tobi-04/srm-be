import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SalerKPI, SalerKPIDocument } from "./entities/saler-kpi.entity";
import {
  SalerDetails,
  SalerDetailsDocument,
} from "../saler-details/entities/saler-details.entity";
import { OrderRepository } from "../order/order.repository";
import dayjs from "dayjs";

@Injectable()
export class SalerKPIService {
  constructor(
    @InjectModel(SalerKPI.name)
    private salerKPIModel: Model<SalerKPIDocument>,
    @InjectModel(SalerDetails.name)
    private salerDetailsModel: Model<SalerDetailsDocument>,
    private orderRepository: OrderRepository,
  ) {}

  /**
   * Get KPI for a specific period
   */
  async getKPI(salerId: string, period?: string) {
    const currentPeriod = period || dayjs().format("YYYY-MM");

    let kpi = await this.salerKPIModel
      .findOne({
        saler_id: new Types.ObjectId(salerId),
        period: currentPeriod,
        is_deleted: false,
      })
      .exec();

    // If no KPI record exists, create a skeleton one using actual revenue and target from SalerDetails
    if (!kpi) {
      const startOfMonth = dayjs(currentPeriod).startOf("month").toDate();
      const endOfMonth = dayjs(currentPeriod).endOf("month").toDate();

      const [actualRevenue, totalOrders, salerDetails] = await Promise.all([
        this.orderRepository.sumRevenueBySalerId(
          salerId,
          startOfMonth,
          endOfMonth,
        ),
        this.orderRepository.countBySalerIdAndDate(
          salerId,
          startOfMonth,
          endOfMonth,
        ),
        this.salerDetailsModel
          .findOne({ user_id: salerId, is_deleted: false })
          .lean()
          .exec(),
      ]);

      const targetRevenue = salerDetails?.kpi_monthly_target || 0;

      return {
        saler_id: salerId,
        period: currentPeriod,
        target_revenue: targetRevenue,
        actual_revenue: actualRevenue,
        total_orders: totalOrders,
        completion_percentage:
          targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0,
      };
    }

    return kpi;
  }

  /**
   * Update actual revenue based on orders
   */
  async refreshKPI(salerId: string, period: string) {
    const startOfMonth = dayjs(period).startOf("month").toDate();
    const endOfMonth = dayjs(period).endOf("month").toDate();

    const [actualRevenue, totalOrders, salerDetails] = await Promise.all([
      this.orderRepository.sumRevenueBySalerId(
        salerId,
        startOfMonth,
        endOfMonth,
      ),
      this.orderRepository.countBySalerIdAndDate(
        salerId,
        startOfMonth,
        endOfMonth,
      ),
      this.salerDetailsModel
        .findOne({ user_id: salerId, is_deleted: false })
        .lean()
        .exec(),
    ]);

    let kpi = await this.salerKPIModel.findOne({
      saler_id: new Types.ObjectId(salerId),
      period: period,
      is_deleted: false,
    });

    if (kpi) {
      kpi.actual_revenue = actualRevenue;
      kpi.total_orders = totalOrders;
      kpi.completion_percentage =
        kpi.target_revenue > 0 ? (actualRevenue / kpi.target_revenue) * 100 : 0;
      await kpi.save();
    } else {
      // Create new KPI record if it doesn't exist during refresh
      const targetRevenue = salerDetails?.kpi_monthly_target || 0;
      kpi = new this.salerKPIModel({
        saler_id: new Types.ObjectId(salerId),
        period,
        target_revenue: targetRevenue,
        actual_revenue: actualRevenue,
        total_orders: totalOrders,
        completion_percentage:
          targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0,
      });
      await kpi.save();
    }

    return kpi;
  }
}
