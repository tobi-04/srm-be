import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument, OrderStatus } from "./entities/order.entity";
import dayjs from "dayjs";

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Find orders by saler ID with pagination and filtering
   */
  async findBySalerId(
    salerId: string,
    query: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
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
      this.orderModel
        .find(filter)
        .populate("course_id", "title slug price")
        .populate("user_submission_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
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
   * Count orders by saler ID and date range
   */
  async countBySalerIdAndDate(
    salerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.orderModel
      .countDocuments({
        saler_id: new Types.ObjectId(salerId),
        status: OrderStatus.PAID,
        paid_at: { $gte: startDate, $lte: endDate },
        is_deleted: false,
      })
      .exec();
  }

  /**
   * Sum revenue by saler ID and date range
   */
  async sumRevenueBySalerId(
    salerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.orderModel
      .aggregate([
        {
          $match: {
            saler_id: new Types.ObjectId(salerId),
            status: OrderStatus.PAID,
            paid_at: { $gte: startDate, $lte: endDate },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ])
      .exec();

    return result[0]?.total || 0;
  }

  /**
   * Get daily revenue chart data for the last N days
   */
  async getDailyRevenueChart(salerId: string, days: number = 30) {
    const endDate = dayjs().endOf("day").toDate();
    const startDate = dayjs()
      .subtract(days - 1, "day")
      .startOf("day")
      .toDate();

    const result = await this.orderModel
      .aggregate([
        {
          $match: {
            saler_id: new Types.ObjectId(salerId),
            status: OrderStatus.PAID,
            paid_at: { $gte: startDate, $lte: endDate },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$paid_at" },
            },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .exec();

    // Create a map of date -> revenue
    const revenueMap = new Map<string, number>();
    result.forEach((item) => {
      revenueMap.set(item._id, item.revenue);
    });

    // Fill in missing dates with 0
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const date = dayjs()
        .subtract(days - 1 - i, "day")
        .format("YYYY-MM-DD");
      chartData.push({
        date,
        revenue: revenueMap.get(date) || 0,
      });
    }

    return chartData;
  }

  /**
   * Create a new order
   */
  async create(orderData: Partial<Order>): Promise<OrderDocument> {
    const order = new this.orderModel(orderData);
    return order.save();
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<Order>,
  ): Promise<OrderDocument | null> {
    const updateData: any = { status, updated_at: new Date() };

    if (status === OrderStatus.PAID) {
      updateData.paid_at = new Date();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    return this.orderModel
      .findByIdAndUpdate(orderId, updateData, { new: true })
      .exec();
  }

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ _id: orderId, is_deleted: false }).exec();
  }
}
