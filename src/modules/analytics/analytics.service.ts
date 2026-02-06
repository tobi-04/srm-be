import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionStatus,
} from "../payment-transaction/entities/payment-transaction.entity";
import { User, UserRole, UserDocument } from "../user/entities/user.entity";
import { Lesson, LessonDocument } from "../lesson/entities/lesson.entity";
import {
  LessonProgress,
  LessonProgressDocument,
  LessonProgressStatus,
} from "../lesson/entities/lesson-progress.entity";
import {
  TrafficSource,
  TrafficSourceDocument,
} from "../traffic-source/entities/traffic-source.entity";
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
} from "../course-enrollment/entities/course-enrollment.entity";
import { Order, OrderDocument } from "../order/entities/order.entity";
import {
  BookOrder,
  BookOrderDocument,
  BookOrderStatus,
} from "../book-store/entities/book-order.entity";
import {
  IndicatorSubscription,
  IndicatorSubscriptionDocument,
  SubscriptionStatus,
} from "../indicator-store/entities/indicator-subscription.entity";
import dayjs from "dayjs";
import { Types } from "mongoose";

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(LessonProgress.name)
    private progressModel: Model<LessonProgressDocument>,
    @InjectModel(TrafficSource.name)
    private trafficSourceModel: Model<TrafficSourceDocument>,
    @InjectModel(CourseEnrollment.name)
    private enrollmentModel: Model<CourseEnrollmentDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(BookOrder.name)
    private bookOrderModel: Model<BookOrderDocument>,
    @InjectModel(IndicatorSubscription.name)
    private indicatorSubscriptionModel: Model<IndicatorSubscriptionDocument>,
  ) {}

  async getDashboardSummary() {
    const now = dayjs();
    const thirtyDaysAgo = now.subtract(30, "day").toDate();
    const sixtyDaysAgo = now.subtract(60, "day").toDate();

    // 1. Total Revenue (Last 30 days vs Previous 30 days)
    const currentRevenue = await this.paymentTransactionModel.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.COMPLETED,
          paid_at: { $gte: thirtyDaysAgo },
          is_deleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const prevRevenue = await this.paymentTransactionModel.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.COMPLETED,
          paid_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
          is_deleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const currentRevValue = currentRevenue[0]?.total || 0;
    const prevRevValue = prevRevenue[0]?.total || 0;
    const revChange =
      prevRevValue === 0
        ? 100
        : ((currentRevValue - prevRevValue) / prevRevValue) * 100;

    // 2. New Students (Last 7 days)
    const sevenDaysAgo = now.subtract(7, "day").toDate();
    const totalStudents = await this.userModel.countDocuments({
      role: UserRole.USER,
      is_deleted: false,
    });
    const newStudentsWeek = await this.userModel.countDocuments({
      role: UserRole.USER,
      created_at: { $gte: sevenDaysAgo },
      is_deleted: false,
    });

    // 3. Active Lessons
    const totalLessons = await this.lessonModel.countDocuments({
      is_deleted: false,
      is_active: true,
    });

    // 4. Completion Rate (Average)
    const completionStats = await this.progressModel.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: null, avgProgress: { $avg: "$progress_percent" } } },
    ]);
    const avgCompletion = completionStats[0]?.avgProgress || 0;

    return {
      revenue: {
        value: currentRevValue,
        change: Math.round(revChange * 10) / 10,
        label: "so với tháng trước",
      },
      students: {
        total: totalStudents,
        newThisWeek: newStudentsWeek,
        change:
          Math.round((newStudentsWeek / (totalStudents || 1)) * 100 * 10) / 10,
        label: "tuần này",
      },
      lessons: {
        total: totalLessons,
        status: "Ổn định",
        label: "trên khóa học",
      },
      completion: {
        rate: Math.round(avgCompletion * 10) / 10,
        change: 2.4, // Mock trend for now as we don't have historical progress readily
        label: "trung bình hệ thống",
      },
    };
  }

  async getRevenueTrend(days: number = 30) {
    const now = dayjs();
    const startDate = now.subtract(days, "day").startOf("day").toDate();

    const trend = await this.paymentTransactionModel.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.COMPLETED,
          paid_at: { $gte: startDate },
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paid_at" } },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create a map for quick lookup
    const trendMap = new Map(trend.map((item) => [item._id, item.amount]));
    const result = [];

    // Fill in last X days
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = now.subtract(i, "day").format("YYYY-MM-DD");
      result.push({
        date: dateStr,
        revenue: trendMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  async getTrafficSourceStats() {
    const stats = await this.trafficSourceModel.aggregate([
      { $match: { is_deleted: false } },
      {
        $group: {
          _id: "$utm_source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = stats.reduce((sum, item) => sum + item.count, 0);

    return stats.map((item) => ({
      name: item._id || "Khác",
      count: item.count,
      percent: Math.round((item.count / (total || 1)) * 100),
    }));
  }

  async getRecentPayments() {
    // Fetch recent transactions from all 3 sources in parallel
    const [courseTransactions, bookOrders, indicatorSubs] = await Promise.all([
      // 1. Course transactions
      this.paymentTransactionModel
        .find({ status: PaymentTransactionStatus.COMPLETED, is_deleted: false })
        .sort({ paid_at: -1 })
        .limit(8)
        .populate("user_form_submission_id")
        .populate("course_id")
        .lean(),

      // 2. Book orders
      this.bookOrderModel
        .find({ status: BookOrderStatus.PAID, is_deleted: false })
        .sort({ paid_at: -1 })
        .limit(8)
        .populate("user_id")
        .lean(),

      // 3. Indicator subscriptions (paid)
      this.indicatorSubscriptionModel
        .find({ status: SubscriptionStatus.ACTIVE, is_deleted: false })
        .sort({ created_at: -1 })
        .limit(8)
        .populate("user_id")
        .populate("indicator_id")
        .lean(),
    ]);

    // Normalize course transactions
    const normalizedCourses = courseTransactions.map((tx: any) => ({
      _id: tx._id,
      type: "course" as const,
      total_amount: tx.amount,
      status: tx.status,
      created_at: tx.created_at || tx._id.getTimestamp(),
      paid_at: tx.paid_at,
      customer_name: tx.user_form_submission_id?.name,
      customer_email: tx.user_form_submission_id?.email,
      item_name: tx.course_id?.title,
      transfer_code: tx.transfer_code,
    }));

    // Normalize book orders
    const normalizedBooks = bookOrders.map((order: any) => ({
      _id: order._id,
      type: "book" as const,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at || order._id.getTimestamp(),
      paid_at: order.paid_at,
      customer_name: order.user_id?.name,
      customer_email: order.user_id?.email,
      item_name:
        order.metadata?.items?.map((i: any) => i.title).join(", ") || "Sách",
      transfer_code: order.transfer_code,
    }));

    // Normalize indicator subscriptions
    const normalizedIndicators = indicatorSubs.map((sub: any) => ({
      _id: sub._id,
      type: "indicator" as const,
      total_amount: sub.metadata?.amount || 0,
      status: sub.status,
      created_at: sub.created_at || sub._id.getTimestamp(),
      paid_at: sub.start_at,
      customer_name: sub.user_id?.name,
      customer_email: sub.user_id?.email,
      item_name: sub.indicator_id?.name,
      transfer_code: sub.transfer_code,
    }));

    // Merge and sort by paid_at descending
    const allTransactions = [
      ...normalizedCourses,
      ...normalizedBooks,
      ...normalizedIndicators,
    ].sort((a, b) => {
      const dateA = a.paid_at || a.created_at;
      const dateB = b.paid_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return allTransactions.slice(0, 8);
  }

  /**
   * Get paginated payment transactions for Admin (all types: course, book, indicator)
   */
  async getTransactionsPaginated(query: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
    type?: string;
  }) {
    const { page, limit, status, search, type } = query;

    // Build pipelines for each transaction type
    const buildCoursePipeline = () => {
      const match: any = { is_deleted: false };
      if (status) match.status = status;

      const pipeline: any[] = [
        { $match: match },
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
            from: "user_form_submissions",
            localField: "user_form_submission_id",
            foreignField: "_id",
            as: "student",
          },
        },
        { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "student.saler_id",
            foreignField: "_id",
            as: "saler",
          },
        },
        { $unwind: { path: "$saler", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: "course" },
            amount: 1,
            status: 1,
            created_at: 1,
            paid_at: 1,
            transfer_code: 1,
            customer_name: "$student.name",
            customer_email: "$student.email",
            item_name: "$course.title",
            saler_name: "$saler.name",
          },
        },
      ];

      if (search) {
        const searchRegex = new RegExp(search, "i");
        pipeline.push({
          $match: {
            $or: [
              { customer_name: searchRegex },
              { customer_email: searchRegex },
              { item_name: searchRegex },
              { saler_name: searchRegex },
              { transfer_code: searchRegex },
            ],
          },
        });
      }

      return pipeline;
    };

    const buildBookPipeline = () => {
      const match: any = { is_deleted: false };
      if (status) match.status = status;

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: "book" },
            amount: "$total_amount",
            status: 1,
            created_at: 1,
            paid_at: 1,
            transfer_code: 1,
            customer_name: "$user.name",
            customer_email: "$user.email",
            item_name: { $literal: "Đơn hàng sách" },
            saler_name: { $literal: null },
          },
        },
      ];

      if (search) {
        const searchRegex = new RegExp(search, "i");
        pipeline.push({
          $match: {
            $or: [
              { customer_name: searchRegex },
              { customer_email: searchRegex },
              { transfer_code: searchRegex },
            ],
          },
        });
      }

      return pipeline;
    };

    const buildIndicatorPipeline = () => {
      const match: any = { is_deleted: false };
      // Map status to subscription status
      if (status === "COMPLETED" || status === "PAID") {
        match.status = SubscriptionStatus.ACTIVE;
      } else if (status === "PENDING") {
        match.status = SubscriptionStatus.PENDING;
      } else if (status) {
        match.status = status;
      }

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "indicators",
            localField: "indicator_id",
            foreignField: "_id",
            as: "indicator",
          },
        },
        { $unwind: { path: "$indicator", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: "indicator" },
            amount: "$indicator.price_monthly",
            status: {
              $cond: {
                if: { $eq: ["$status", "ACTIVE"] },
                then: "COMPLETED",
                else: "$status",
              },
            },
            created_at: 1,
            paid_at: "$start_at",
            transfer_code: 1,
            customer_name: "$user.name",
            customer_email: "$user.email",
            item_name: "$indicator.name",
            saler_name: { $literal: null },
          },
        },
      ];

      if (search) {
        const searchRegex = new RegExp(search, "i");
        pipeline.push({
          $match: {
            $or: [
              { customer_name: searchRegex },
              { customer_email: searchRegex },
              { item_name: searchRegex },
              { transfer_code: searchRegex },
            ],
          },
        });
      }

      return pipeline;
    };

    // Decide which collections to query based on type filter
    const queries: Promise<any[]>[] = [];
    if (!type || type === "course") {
      queries.push(
        this.paymentTransactionModel.aggregate(buildCoursePipeline()).exec(),
      );
    }
    if (!type || type === "book") {
      queries.push(this.bookOrderModel.aggregate(buildBookPipeline()).exec());
    }
    if (!type || type === "indicator") {
      queries.push(
        this.indicatorSubscriptionModel
          .aggregate(buildIndicatorPipeline())
          .exec(),
      );
    }

    const results = await Promise.all(queries);
    const allData = results.flat();

    // Sort by created_at descending
    allData.sort((a, b) => {
      const dateA = a.paid_at || a.created_at || a._id.getTimestamp();
      const dateB = b.paid_at || b.created_at || b._id.getTimestamp();
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const total = allData.length;
    const skip = (page - 1) * limit;
    const paginatedData = allData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProgressSummary() {
    const now = dayjs();
    const startOfDay = now.startOf("day").toDate();
    const startOfMonth = now.startOf("month").toDate();

    // 1. Avg Completion Rate
    const avgCompletion = await this.enrollmentModel.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: null, avg: { $avg: "$progress_percent" } } },
    ]);

    // 2. Active Students Today (Completed at least 1 lesson today via progress update)
    const activeToday = await this.progressModel.countDocuments({
      updated_at: { $gte: startOfDay },
      is_deleted: false,
    });

    // 3. Completed Today (Lessons marked as completed today)
    const completedToday = await this.progressModel.countDocuments({
      status: LessonProgressStatus.COMPLETED,
      completed_at: { $gte: startOfDay },
      is_deleted: false,
    });

    // 4. Total Duration this month
    const totalDuration = await this.progressModel.aggregate([
      {
        $match: {
          updated_at: { $gte: startOfMonth },
          is_deleted: false,
        },
      },
      { $group: { _id: null, total: { $sum: "$watch_time" } } },
    ]);

    return {
      avgCompletion: Math.round((avgCompletion[0]?.avg || 0) * 10) / 10,
      activeToday,
      completedToday,
      totalDurationHours:
        Math.round(((totalDuration[0]?.total || 0) / 3600) * 10) / 10,
    };
  }

  async getStudentProgressPaginated(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const match: any = { is_deleted: false };

    if (status === "completed") {
      match.progress_percent = { $gte: 100 };
    } else if (status === "learning") {
      match.progress_percent = { $lt: 100 };
    }

    const pipeline: any[] = [{ $match: match }];

    // Lookup User
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "student",
      },
    });
    pipeline.push({ $unwind: "$student" });

    // Lookup Course
    pipeline.push({
      $lookup: {
        from: "courses",
        localField: "course_id",
        foreignField: "_id",
        as: "course",
      },
    });
    pipeline.push({ $unwind: "$course" });

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "student.name": { $regex: search, $options: "i" } },
            { "student.email": { $regex: search, $options: "i" } },
            { "course.title": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Sort by activity
    pipeline.push({ $sort: { last_activity_at: -1 } });

    // Count and Facet for pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const results = await this.enrollmentModel.aggregate(pipeline);
    const total = results[0]?.metadata[0]?.total || 0;
    const data = results[0]?.data || [];

    return {
      data: data.map((item) => ({
        id: item._id,
        student: {
          id: item.student._id,
          name: item.student.name,
          email: item.student.email,
          avatar: item.student.avatar,
        },
        course: {
          id: item.course._id,
          title: item.course.title,
          slug: item.course.slug,
        },
        progress: item.progress_percent,
        startDate: item.enrolled_at,
        lastActivity: item.last_activity_at,
        isCompleted: item.progress_percent >= 100,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get daily sales snapshot for the last N days
   */
  async getDailySalesSnapshot(days: number = 14) {
    const endDate = dayjs().endOf("day").toDate();
    const startDate = dayjs()
      .subtract(days - 1, "day")
      .startOf("day")
      .toDate();

    const dailyData = await this.paymentTransactionModel.aggregate([
      {
        $match: {
          status: PaymentTransactionStatus.COMPLETED,
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
        },
      },
      { $sort: { _id: -1 } },
    ]);

    // Create map of existing data
    const dataMap = new Map(dailyData.map((d) => [d._id, d.revenue]));

    // Generate all days in range with data
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = dayjs().subtract(i, "day");
      const dateStr = date.format("YYYY-MM-DD");
      result.push({
        date: dateStr,
        dayOfWeek: date.format("ddd"),
        revenue: dataMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  /**
   * Get weekly sales snapshot for the last N weeks
   */
  async getWeeklySalesSnapshot(weeks: number = 4) {
    const result = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = dayjs()
        .subtract(i * 7, "day")
        .endOf("day");
      const weekStart = weekEnd.subtract(6, "day").startOf("day");

      const weekRevenue = await this.paymentTransactionModel.aggregate([
        {
          $match: {
            status: PaymentTransactionStatus.COMPLETED,
            paid_at: {
              $gte: weekStart.toDate(),
              $lte: weekEnd.toDate(),
            },
            is_deleted: false,
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$amount" },
          },
        },
      ]);

      result.push({
        weekEnding: weekEnd.format("YYYY-MM-DD"),
        weekLabel: `${weekStart.format("YYYY-MM-DD")} - ${weekEnd.format("YYYY-MM-DD")}`,
        revenue: weekRevenue[0]?.revenue || 0,
      });
    }

    return result.reverse();
  }
}
