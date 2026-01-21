import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OrderService } from "../order/order.service";
import { OrderStatus } from "../order/entities/order.entity";
import { CommissionService } from "../commission/commission.service";
import { SalerKPIService } from "../saler-kpi/saler-kpi.service";
import { LandingPageService } from "../landing-page/landing-page.service";
import { SalerStudentsQuery } from "./dto/saler-students-query.dto";
import {
  SalerDetails,
  SalerDetailsDocument,
} from "../saler-details/entities/saler-details.entity";
import { Course, CourseDocument } from "../course/entities/course.entity";
import dayjs from "dayjs";
import { SalerOrdersQuery } from "./dto/saler-orders-query.dto";
import {
  SalerDashboardResponse,
  SalerCoursesResponse,
} from "./dto/saler-response.dto";
import { CommissionStatus } from "../commission/entities/commission.entity";

@Injectable()
export class SalerService {
  constructor(
    private readonly orderService: OrderService,
    private readonly commissionService: CommissionService,
    private readonly salerKPIService: SalerKPIService,
    private readonly landingPageService: LandingPageService,
    @InjectModel(SalerDetails.name)
    private salerDetailsModel: Model<SalerDetailsDocument>,
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
  ) {}

  /**
   * Get dashboard overview for saler
   * @param salerId - Saler user ID
   * @param days - Number of days for chart data (default: 7)
   */
  async getDashboardOverview(
    salerId: string,
    days: number = 7,
  ): Promise<SalerDashboardResponse> {
    const startOfToday = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();
    const startOfMonth = dayjs().startOf("month").toDate();
    const endOfMonth = dayjs().endOf("month").toDate();
    const allTimeStart = new Date(0); // Unix epoch

    // Parallel queries for performance
    const [
      ordersToday,
      ordersMonth,
      totalRevenue,
      commissionSummary,
      chartData,
      salerDetails,
    ] = await Promise.all([
      this.orderService.countBySalerIdAndDate(
        salerId,
        startOfToday,
        endOfToday,
      ),
      this.orderService.countBySalerIdAndDate(
        salerId,
        startOfMonth,
        endOfMonth,
      ),
      this.orderService.sumRevenueBySalerId(salerId, allTimeStart, new Date()),
      this.commissionService.getSummaryBySalerId(salerId),
      this.orderService.getDailyRevenueChart(salerId, days),
      this.salerDetailsModel
        .findOne({ user_id: salerId, is_deleted: false })
        .lean()
        .exec(),
    ]);

    // Calculate total commission (available + pending)
    const totalCommission =
      commissionSummary.available.total + commissionSummary.pending.total;

    // Calculate KPI completion percentage
    const monthlyTarget = salerDetails?.kpi_monthly_target || 0;
    const monthlyRevenue = await this.orderService.sumRevenueBySalerId(
      salerId,
      startOfMonth,
      endOfMonth,
    );
    const kpiCompletion =
      monthlyTarget > 0 ? (monthlyRevenue / monthlyTarget) * 100 : 0;

    return {
      orders_today: ordersToday,
      orders_month: ordersMonth,
      total_revenue: totalRevenue,
      total_commission: totalCommission,
      kpi_completion: Math.round(kpiCompletion * 100) / 100, // 2 decimal places
      chart_data: chartData,
    };
  }

  /**
   * Get orders for saler with pagination and filtering
   * Shows both pending submissions and paid orders
   */
  async getOrders(salerId: string, query: SalerOrdersQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // Query all submissions by saler (source of truth)
    const submissions =
      await this.landingPageService.findUserFormSubmissionsBySalerId(salerId, {
        page,
        limit,
      });

    if (submissions.data.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Get submission IDs
    const submissionIds = submissions.data.map((s: any) => s._id.toString());

    // Find orders for these submissions
    const orders = await this.orderService.findBySubmissionIds(submissionIds);

    // Create a map of submission_id -> order for quick lookup
    const orderMap = new Map(
      orders.map((o: any) => [o.user_submission_id.toString(), o]),
    );

    // Merge data: submissions with payment status
    const data = submissions.data.map((submission: any) => {
      const order = orderMap.get(submission._id.toString());
      const course = submission.landing_page_id?.course_id;

      return {
        _id: submission._id,
        submission_id: submission._id,
        student_name: submission.name,
        student_email: submission.email,
        student_phone: submission.phone,
        address: submission.address,
        landing_page: {
          _id: submission.landing_page_id?._id,
          title: submission.landing_page_id?.title,
        },
        course: course
          ? {
              _id: course._id,
              title: course.title,
              slug: course.slug,
              price: course.price,
            }
          : null,
        status: order ? "paid" : "pending",
        amount: order?.amount || null,
        paid_at: order?.paid_at || null,
        created_at: submission.created_at,
        referral_code: submission.referral_code,
      };
    });

    // Filter by status if specified
    let filteredData = data;
    if (query.status) {
      filteredData = data.filter((item: any) => item.status === query.status);
    }

    return {
      data: filteredData,
      meta: {
        total: submissions.total,
        page,
        limit,
        totalPages: Math.ceil(submissions.total / limit),
      },
    };
  }

  /**
   * Get assigned courses with referral links
   */
  async getCourses(salerId: string): Promise<SalerCoursesResponse> {
    const salerDetails = await this.salerDetailsModel
      .findOne({ user_id: salerId, is_deleted: false })
      .lean()
      .exec();

    if (!salerDetails || !salerDetails.assigned_courses) {
      return { data: [] };
    }

    // Fetch course details
    const courses = await this.courseModel
      .find({
        _id: { $in: salerDetails.assigned_courses },
        is_deleted: false,
      })
      .select("_id title slug price")
      .lean()
      .exec();

    // Generate referral links and include commission rate
    const domain = process.env.FRONTEND_DOMAIN || "http://localhost:3000";
    const data = courses.map((course) => {
      // Find specific commission for this course
      const specificCommission = salerDetails.course_commissions?.find(
        (cc) => cc.course_id.toString() === course._id.toString(),
      );

      return {
        ...course,
        _id: course._id.toString(),
        commission_rate:
          specificCommission?.commission_rate ??
          salerDetails.default_commission_rate ??
          0,
        referral_link: `${domain}/landing/${course._id}?ref=${salerDetails.code_saler}`,
        referral_code: salerDetails.code_saler,
      };
    });

    return { data };
  }

  /**
   * Get commissions for saler with pagination and filtering
   */
  async getCommissions(
    salerId: string,
    query: { page?: number; limit?: number; status?: CommissionStatus },
  ) {
    return this.commissionService.findBySalerId(salerId, query);
  }

  /**
   * Get commission summary by saler
   */
  async getCommissionSummary(salerId: string) {
    return this.commissionService.getSummaryBySalerId(salerId);
  }

  /**
   * Get KPI for saler
   */
  async getKPI(salerId: string, period?: string) {
    return this.salerKPIService.getKPI(salerId, period);
  }

  /**
   * Get students who purchased through saler
   */
  async getStudents(salerId: string, query: SalerStudentsQuery) {
    // We can get students through orders
    const orders = await this.orderService.findBySalerId(salerId, {
      limit: 1000,
      status: OrderStatus.PAID,
    });

    const studentsMap = new Map();
    orders.data.forEach((order: any) => {
      const student = order.user_submission_id;
      if (
        student &&
        typeof student !== "string" &&
        !studentsMap.has(student._id.toString())
      ) {
        studentsMap.set(student._id.toString(), {
          _id: student._id,
          name: student.name,
          email: student.email,
          purchased_courses: [],
          total_spent: 0,
        });
      }

      if (student && typeof student !== "string") {
        const studentInfo = studentsMap.get(student._id.toString());
        studentInfo.purchased_courses.push(order.course_id);
        studentInfo.total_spent += order.amount;
      }
    });

    let students = Array.from(studentsMap.values());
    if (query.search) {
      const search = query.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search),
      );
    }

    return { data: students };
  }

  /**
   * Get saler bank account information
   */
  async getBankAccount(salerId: string) {
    const salerDetails = await this.salerDetailsModel
      .findOne({ user_id: salerId, is_deleted: false })
      .select("bank_account")
      .lean()
      .exec();

    return {
      bank_account: salerDetails?.bank_account || null,
    };
  }

  /**
   * Update saler bank account information
   */
  async updateBankAccount(
    salerId: string,
    dto: {
      account_holder: string;
      account_number: string;
      bank_code: string;
      bank_name: string;
    },
  ) {
    const result = await this.salerDetailsModel.findOneAndUpdate(
      { user_id: salerId, is_deleted: false },
      {
        $set: {
          bank_account: {
            account_holder: dto.account_holder.toUpperCase(),
            account_number: dto.account_number,
            bank_code: dto.bank_code,
            bank_name: dto.bank_name,
          },
          updated_at: new Date(),
        },
      },
      { new: true },
    );

    if (!result) {
      throw new Error("Saler details not found");
    }

    return {
      message: "Bank account updated successfully",
      bank_account: result.bank_account,
    };
  }
}
