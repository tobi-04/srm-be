import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { SalerKPI, SalerKPIDocument } from "./entities/saler-kpi.entity";
import {
  SalerDetails,
  SalerDetailsDocument,
} from "../saler-details/entities/saler-details.entity";
import { OrderRepository } from "../order/order.repository";
import { Order } from "../order/entities/order.entity";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(quarterOfYear);

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
   * Refresh KPI when an order is paid
   */
  @OnEvent("order.paid")
  async handleOrderPaid(order: Order) {
    if (!order.saler_id) return;

    const period = dayjs(order.paid_at || new Date()).format("YYYY-MM");
    await this.refreshKPI(order.saler_id, period);
  }

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

  /**
   * Get periods based on period type
   */
  private getPeriods(periodType: "month" | "quarter" | "year"): {
    periods: string[];
    startDate: Date;
    endDate: Date;
  } {
    const now = dayjs();
    let periods: string[] = [];
    let startDate: Date;
    let endDate: Date = now.endOf("day").toDate();

    if (periodType === "month") {
      const period = now.format("YYYY-MM");
      periods = [period];
      startDate = now.startOf("month").toDate();
      endDate = now.endOf("month").toDate();
    } else if (periodType === "quarter") {
      const quarter = Math.ceil((now.month() + 1) / 3);
      const startMonth = (quarter - 1) * 3;
      startDate = now.month(startMonth).startOf("month").toDate();
      endDate = now
        .month(startMonth + 2)
        .endOf("month")
        .toDate();

      for (let i = 0; i < 3; i++) {
        periods.push(now.month(startMonth + i).format("YYYY-MM"));
      }
    } else {
      // year
      startDate = now.startOf("year").toDate();
      endDate = now.endOf("year").toDate();

      for (let i = 0; i < 12; i++) {
        periods.push(now.month(i).format("YYYY-MM"));
      }
    }

    return { periods, startDate, endDate };
  }

  /**
   * Get top salers by KPI achievement
   */
  async getTopSalers(
    periodType: "month" | "quarter" | "year" = "month",
    limit: number = 3,
  ) {
    const { periods, startDate, endDate } = this.getPeriods(periodType);

    // Get all active salers
    const salerDetails = await this.salerDetailsModel
      .find({ is_deleted: false })
      .populate("user_id", "name email avatar")
      .lean()
      .exec();

    const results = await Promise.all(
      salerDetails.map(async (saler) => {
        const salerId =
          saler.user_id?.["_id"]?.toString() || saler.user_id?.toString();
        if (!salerId) return null;

        const [actualRevenue, totalOrders] = await Promise.all([
          this.orderRepository.sumRevenueBySalerId(salerId, startDate, endDate),
          this.orderRepository.countBySalerIdAndDate(
            salerId,
            startDate,
            endDate,
          ),
        ]);

        const targetRevenue = (saler.kpi_monthly_target || 0) * periods.length;
        const completionPercentage =
          targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0;

        return {
          saler_id: salerId,
          name: saler.user_id?.["name"] || "Unknown",
          email: saler.user_id?.["email"] || "",
          avatar: saler.user_id?.["avatar"] || null,
          target_revenue: targetRevenue,
          actual_revenue: actualRevenue,
          total_orders: totalOrders,
          completion_percentage: Math.round(completionPercentage * 100) / 100,
          exceeded_by:
            completionPercentage > 100
              ? Math.round((completionPercentage - 100) * 100) / 100
              : 0,
        };
      }),
    );

    // Filter nulls and sort by completion_percentage desc
    return results
      .filter((r) => r !== null && r.target_revenue > 0)
      .sort((a, b) => b!.completion_percentage - a!.completion_percentage)
      .slice(0, limit);
  }

  /**
   * Get overall KPI statistics
   */
  async getKPIStatistics(periodType: "month" | "quarter" | "year" = "month") {
    const { periods, startDate, endDate } = this.getPeriods(periodType);

    const salerDetails = await this.salerDetailsModel
      .find({ is_deleted: false })
      .lean()
      .exec();

    const totalSalers = salerDetails.length;
    let achievedCount = 0;
    let totalCompletionSum = 0;

    await Promise.all(
      salerDetails.map(async (saler) => {
        const salerId = saler.user_id?.toString();
        if (!salerId) return;

        const actualRevenue = await this.orderRepository.sumRevenueBySalerId(
          salerId,
          startDate,
          endDate,
        );

        const targetRevenue = (saler.kpi_monthly_target || 0) * periods.length;
        const completionPercentage =
          targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0;

        totalCompletionSum += completionPercentage;
        if (completionPercentage >= 100) {
          achievedCount++;
        }
      }),
    );

    return {
      total_salers: totalSalers,
      achieved_count: achievedCount,
      achieved_percentage:
        totalSalers > 0
          ? Math.round((achievedCount / totalSalers) * 100 * 100) / 100
          : 0,
      avg_completion:
        totalSalers > 0
          ? Math.round((totalCompletionSum / totalSalers) * 100) / 100
          : 0,
    };
  }

  /**
   * Get KPI achievement chart data
   */
  async getKPIChart(
    periodType: "month" | "quarter" | "year" = "month",
    count: number = 6,
  ) {
    const salerDetails = await this.salerDetailsModel
      .find({ is_deleted: false })
      .lean()
      .exec();

    const results = [];
    const now = dayjs();

    for (let i = count - 1; i >= 0; i--) {
      let label = "";
      let startDate: Date;
      let endDate: Date;
      let period = "";
      let multiplier = 1;

      if (periodType === "month") {
        const month = now.subtract(i, "month");
        label = month.format("MM/YYYY");
        startDate = month.startOf("month").toDate();
        endDate = month.endOf("month").toDate();
        period = month.format("YYYY-MM");
        multiplier = 1;
      } else if (periodType === "quarter") {
        const quarterDate = now.subtract(i, "quarter");
        const quarter = Math.ceil((quarterDate.month() + 1) / 3);
        label = `Q${quarter}/${quarterDate.year()}`;
        startDate = quarterDate.startOf("quarter").toDate();
        endDate = quarterDate.endOf("quarter").toDate();
        period = `${quarterDate.year()}-Q${quarter}`;
        multiplier = 3;
      } else {
        // year
        const yearDate = now.subtract(i, "year");
        label = yearDate.format("YYYY");
        startDate = yearDate.startOf("year").toDate();
        endDate = yearDate.endOf("year").toDate();
        period = yearDate.format("YYYY");
        multiplier = 12;
      }

      let achievedCount = 0;

      await Promise.all(
        salerDetails.map(async (saler) => {
          const salerId = saler.user_id?.toString();
          if (!salerId) return;

          const actualRevenue = await this.orderRepository.sumRevenueBySalerId(
            salerId,
            startDate,
            endDate,
          );

          const targetRevenue = (saler.kpi_monthly_target || 0) * multiplier;
          if (targetRevenue > 0 && actualRevenue >= targetRevenue) {
            achievedCount++;
          }
        }),
      );

      results.push({
        period,
        label,
        achieved_count: achievedCount,
        total_salers: salerDetails.length,
      });
    }

    return results;
  }

  /**
   * Get detailed saler analytics
   */
  async getSalerDetails(
    salerId: string,
    periodType: "month" | "quarter" | "year" = "month",
  ) {
    const { periods, startDate, endDate } = this.getPeriods(periodType);

    const [salerDetails, orders] = await Promise.all([
      this.salerDetailsModel
        .findOne({ user_id: salerId, is_deleted: false })
        .populate("user_id", "name email avatar")
        .lean()
        .exec(),
      this.orderRepository.findBySalerIdAndDate(salerId, startDate, endDate),
    ]);

    if (!salerDetails) {
      return null;
    }

    // Calculate revenue
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Calculate KPI
    const targetRevenue =
      (salerDetails.kpi_monthly_target || 0) * periods.length;
    const completionPercentage =
      targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

    // Get top 3 courses by sales
    const courseSales: Record<
      string,
      { count: number; revenue: number; title: string }
    > = {};
    orders.forEach((order: any) => {
      const courseId =
        order.course_id?._id?.toString() ||
        order.course_id?.toString() ||
        "unknown";
      const courseTitle = order.course_id?.title || "Unknown Course";
      if (!courseSales[courseId]) {
        courseSales[courseId] = { count: 0, revenue: 0, title: courseTitle };
      }
      courseSales[courseId].count++;
      courseSales[courseId].revenue += order.amount || 0;
    });

    const topCourses = Object.entries(courseSales)
      .map(([courseId, data]) => ({
        course_id: courseId,
        title: data.title,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      saler_id: salerId,
      name: salerDetails.user_id?.["name"] || "Unknown",
      email: salerDetails.user_id?.["email"] || "",
      avatar: salerDetails.user_id?.["avatar"] || null,
      target_revenue: targetRevenue,
      actual_revenue: totalRevenue,
      total_orders: orders.length,
      completion_percentage: Math.round(completionPercentage * 100) / 100,
      top_courses: topCourses,
      period_type: periodType,
    };
  }
}
