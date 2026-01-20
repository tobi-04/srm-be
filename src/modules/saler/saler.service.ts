import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OrderService } from "../order/order.service";
import { OrderStatus } from "../order/entities/order.entity";
import { CommissionService } from "../commission/commission.service";
import { SalerKPIService } from "../saler-kpi/saler-kpi.service";
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
    @InjectModel(SalerDetails.name)
    private salerDetailsModel: Model<SalerDetailsDocument>,
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
  ) {}

  /**
   * Get dashboard overview for saler
   */
  async getDashboardOverview(salerId: string): Promise<SalerDashboardResponse> {
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
      this.orderService.getDailyRevenueChart(salerId, 30),
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
   */
  async getOrders(salerId: string, query: SalerOrdersQuery) {
    return this.orderService.findBySalerId(salerId, query);
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
        referral_link: `${domain}/landing/${course._id}?ref=${salerDetails.user_id}`,
        referral_code: salerDetails.user_id.toString(),
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
}
