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
   * Find all orders with pagination, search and filtering for Admin
   */
  async findAllForAdmin(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { is_deleted: false };

    if (query.status) {
      filter.status = query.status;
    }

    // Basic filter first, search might require aggregation if searching in populated fields
    // For simplicity, we'll use regex if we had the fields directly, but since we use populate,
    // we might need a more advanced approach if searching by student name/course title.
    // However, if the search term looks like an ID, we can search by ID directly.
    if (query.search) {
      if (Types.ObjectId.isValid(query.search)) {
        filter.$or = [{ _id: new Types.ObjectId(query.search) }];
      } else {
        // We'll search in amount or status if they are strings, but usually search is for names.
        // For populated fields search in Mongoose, we'd need aggregation or separate queries.
        // Let's assume for now we search on the Order fields directly if any match.
      }
    }

    // To properly search by student name or course title, we need to find those IDs first
    // or use aggregation. Given the repo structure, aggregation is cleaner.

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: "user_form_submissions",
          localField: "user_submission_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "courses",
          localField: "course_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "saler_id",
          foreignField: "_id",
          as: "saler",
        },
      },
      { $unwind: { path: "$saler", preserveNullAndEmptyArrays: true } },
    ];

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "student.name": searchRegex },
            { "student.email": searchRegex },
            { "course.title": searchRegex },
            { "saler.name": searchRegex },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];

    pipeline.push(
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
    );

    const [data, countResult] = await Promise.all([
      this.orderModel.aggregate(pipeline).exec(),
      this.orderModel.aggregate(countPipeline).exec(),
    ]);

    const total = countResult[0]?.total || 0;

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
   * Find orders by saler ID and date range
   */
  async findBySalerIdAndDate(
    salerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        saler_id: new Types.ObjectId(salerId),
        status: OrderStatus.PAID,
        paid_at: { $gte: startDate, $lte: endDate },
        is_deleted: false,
      })
      .populate("course_id", "title")
      .lean()
      .exec() as any;
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

  /**
   * Find orders by submission IDs
   */
  async findBySubmissionIds(submissionIds: string[]): Promise<any[]> {
    return this.orderModel
      .find({
        user_submission_id: { $in: submissionIds },
        is_deleted: false,
      })
      .lean()
      .exec();
  }
}
