import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CourseEnrollmentService } from "../course-enrollment/course-enrollment.service";
import {
  StudentCoursesQuery,
  CourseStatusFilter,
  StudentOrdersQuery,
} from "./dto/student-query.dto";
import {
  StudentDashboardResponse,
  StudentCoursesResponse,
  StudentCourseDto,
  StudentCourseDetailResponse,
  StudentLessonDto,
} from "./dto/student-response.dto";
import { UpdateProfileDto } from "./dto/student-profile.dto";
import { Course, CourseDocument } from "../course/entities/course.entity";
import { Lesson, LessonDocument } from "../lesson/entities/lesson.entity";
import { User, UserDocument } from "../user/entities/user.entity";
import {
  PaymentTransaction,
  PaymentTransactionDocument,
} from "../payment-transaction/entities/payment-transaction.entity";
import {
  LessonProgress,
  LessonProgressDocument,
  LessonProgressStatus,
} from "../lesson/entities/lesson-progress.entity";
import {
  UserFormSubmission,
  UserFormSubmissionDocument,
} from "../landing-page/entities/user-form-submission.entity";

import {
  BookOrder,
  BookOrderDocument,
} from "../book-store/entities/book-order.entity";
import {
  BookOrderItem,
  BookOrderItemDocument,
} from "../book-store/entities/book-order-item.entity";
import {
  IndicatorSubscription,
  IndicatorSubscriptionDocument,
} from "../indicator-store/entities/indicator-subscription.entity";
import {
  Indicator,
  IndicatorDocument,
} from "../indicator-store/entities/indicator.entity";

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
    @InjectModel(Lesson.name)
    private lessonModel: Model<LessonDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(PaymentTransaction.name)
    private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(LessonProgress.name)
    private lessonProgressModel: Model<LessonProgressDocument>,
    @InjectModel(UserFormSubmission.name)
    private userFormSubmissionModel: Model<UserFormSubmissionDocument>,
    @InjectModel(BookOrder.name)
    private bookOrderModel: Model<BookOrderDocument>,
    @InjectModel(BookOrderItem.name)
    private bookOrderItemModel: Model<BookOrderItemDocument>,
    @InjectModel(IndicatorSubscription.name)
    private indicatorSubscriptionModel: Model<IndicatorSubscriptionDocument>,
    @InjectModel(Indicator.name)
    private indicatorModel: Model<IndicatorDocument>,
    private courseEnrollmentService: CourseEnrollmentService,
  ) {}

  /**
   * Get dashboard overview for student
   * Cache: 5 minutes
   */
  async getDashboardOverview(
    studentId: string,
  ): Promise<StudentDashboardResponse> {
    // Get student info
    const student = await this.userModel
      .findById(studentId)
      .select("name email avatar")
      .lean();

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Get enrollments
    const enrollments =
      await this.courseEnrollmentService.getUserEnrollments(studentId);
    const courseIds = enrollments.map((e) => e.course_id);

    // Get courses with progress
    const courses = await this.courseModel
      .find({
        _id: { $in: courseIds },
        is_deleted: false,
      })
      .select("title slug description thumbnail price")
      .limit(3)
      .sort({ updated_at: -1 })
      .lean();

    // Calculate progress for each course
    const recentCourses: StudentCourseDto[] = await Promise.all(
      courses.map(async (course) => {
        const enrollment = enrollments.find(
          (e) => e.course_id.toString() === course._id.toString(),
        );

        // Get total lessons
        const totalLessons = await this.lessonModel.countDocuments({
          course_id: course._id,
          is_deleted: false,
        });

        // Get completed lessons from progress tracking
        const completedLessons = await this.lessonProgressModel.countDocuments({
          user_id: studentId,
          course_id: course._id,
          status: LessonProgressStatus.COMPLETED,
        });

        const progressPercent =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        return {
          _id: course._id.toString(),
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnail: undefined,
          price: course.price,
          enrolled_at: enrollment.enrolled_at,
          progress_percent: progressPercent,
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          is_completed: progressPercent >= 100,
          last_accessed_at: enrollment.updated_at,
        };
      }),
    );

    // Calculate stats
    const totalCourses = enrollments.length;
    const completedCourses = recentCourses.filter((c) => c.is_completed).length;
    const inProgressCourses = totalCourses - completedCourses;
    const totalLessonsCompleted = recentCourses.reduce(
      (sum, c) => sum + c.completed_lessons,
      0,
    );

    return {
      student: {
        _id: student._id.toString(),
        name: student.name,
        email: student.email,
        avatar: undefined,
      },
      recent_courses: recentCourses,
      stats: {
        total_courses: totalCourses,
        in_progress_courses: inProgressCourses,
        completed_courses: completedCourses,
        total_lessons_completed: totalLessonsCompleted,
      },
      notifications: [],
    };
  }

  /**
   * Get student's enrolled courses with pagination
   * Cache: 5 minutes
   */
  async getCourses(
    studentId: string,
    query: StudentCoursesQuery,
  ): Promise<StudentCoursesResponse> {
    const { page = 1, limit = 20, status = CourseStatusFilter.ALL } = query;

    // Get enrollments
    const allEnrollments =
      await this.courseEnrollmentService.getUserEnrollments(studentId);
    const courseIds = allEnrollments.map((e) => e.course_id);

    if (courseIds.length === 0) {
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

    // Get courses
    const courses = await this.courseModel
      .find({
        _id: { $in: courseIds },
        is_deleted: false,
      })
      .select("title slug description thumbnail price")
      .lean();

    // Calculate progress for each course
    let coursesWithProgress: StudentCourseDto[] = await Promise.all(
      courses.map(async (course) => {
        const enrollment = allEnrollments.find(
          (e) => e.course_id.toString() === course._id.toString(),
        );

        const totalLessons = await this.lessonModel.countDocuments({
          course_id: course._id,
          is_deleted: false,
        });

        // Get completed lessons from progress tracking
        const completedLessons = await this.lessonProgressModel.countDocuments({
          user_id: studentId,
          course_id: course._id,
          status: LessonProgressStatus.COMPLETED,
        });

        const progressPercent =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        return {
          _id: course._id.toString(),
          title: course.title,
          slug: course.slug,
          description: course.description,
          thumbnail: undefined,
          price: course.price,
          enrolled_at: enrollment.enrolled_at,
          progress_percent: progressPercent,
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          is_completed: progressPercent >= 100,
          last_accessed_at: enrollment.updated_at,
        };
      }),
    );

    // Filter by status
    if (status === CourseStatusFilter.IN_PROGRESS) {
      coursesWithProgress = coursesWithProgress.filter((c) => !c.is_completed);
    } else if (status === CourseStatusFilter.COMPLETED) {
      coursesWithProgress = coursesWithProgress.filter((c) => c.is_completed);
    }

    // Sort by last accessed
    coursesWithProgress.sort(
      (a, b) =>
        (b.last_accessed_at?.getTime() || 0) -
        (a.last_accessed_at?.getTime() || 0),
    );

    // Pagination
    const total = coursesWithProgress.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCourses = coursesWithProgress.slice(startIndex, endIndex);

    return {
      data: paginatedCourses,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get course details with lessons for student
   * Cache: 5 minutes
   */
  async getCourseDetail(
    studentId: string,
    slug: string,
  ): Promise<StudentCourseDetailResponse> {
    // Get course
    const course = await this.courseModel
      .findOne({ slug, is_deleted: false })
      .select("title slug description thumbnail")
      .lean();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check enrollment
    const isEnrolled = await this.courseEnrollmentService.isUserEnrolled(
      studentId,
      course._id.toString(),
    );

    if (!isEnrolled) {
      throw new NotFoundException("Not enrolled in this course");
    }

    const enrollment = await this.courseEnrollmentService.getEnrollment(
      studentId,
      course._id.toString(),
    );

    // Get lessons
    const lessons = await this.lessonModel
      .find({
        course_id: course._id,
        is_deleted: false,
      })
      .select("title description order video_url video_duration is_locked")
      .sort({ order: 1 })
      .lean();

    // Map lessons with progress
    const lessonsWithProgress: StudentLessonDto[] = lessons.map((lesson) => {
      // TODO: Get progress from tracking
      const isCompleted = false;
      const progressPercent = 0;

      return {
        _id: lesson._id.toString(),
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        video_url: lesson.video,
        video_duration: undefined,
        is_locked: false,
        is_completed: isCompleted,
        progress_percent: progressPercent,
      };
    });

    // Calculate overall course progress
    const totalLessons = lessons.length;
    const completedLessons = lessonsWithProgress.filter(
      (l) => l.is_completed,
    ).length;
    const progressPercent =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return {
      _id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      description: course.description,
      thumbnail: undefined,
      enrolled_at: enrollment.enrolled_at,
      progress_percent: progressPercent,
      lessons: lessonsWithProgress,
    };
  }

  /**
   * Get student profile
   */
  async getProfile(studentId: string): Promise<any> {
    const student = await this.userModel
      .findById(studentId)
      .select("name email phone avatar created_at")
      .lean();

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    return student;
  }

  /**
   * Update student profile
   */
  async updateProfile(
    studentId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<any> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        studentId,
        {
          ...updateProfileDto,
          updated_at: new Date(),
        },
        { new: true },
      )
      .select("name email phone avatar created_at");

    if (!updated) {
      throw new NotFoundException("Student not found");
    }

    return updated;
  }

  /**
   * Get student's order history (Courses, Books, Indicators)
   * Cache: 5 minutes
   */
  async getOrders(studentId: string, query: StudentOrdersQuery): Promise<any> {
    const { page = 1, limit = 20, status } = query;

    // 1. Get Course Orders
    // ---------------------------------------------------------
    const user = await this.userModel
      .findById(studentId)
      .select("email")
      .lean();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const userFormSubmissions = await this.userFormSubmissionModel
      .find({ email: user.email, is_deleted: false })
      .select("_id")
      .lean();

    const submissionIds = userFormSubmissions.map((s) => s._id);

    const courseFilter: any = {
      user_form_submission_id: { $in: submissionIds },
      is_deleted: false,
    };
    if (status) courseFilter.status = status;

    const courseOrdersPromise = this.paymentTransactionModel
      .find(courseFilter)
      .populate("course_id", "title")
      .select("course_id amount status paid_at created_at")
      .lean();

    // 2. Get Book Orders
    // ---------------------------------------------------------
    const bookFilter: any = {
      user_id: studentId,
    };
    if (status) bookFilter.status = status;

    const bookOrdersPromise = this.bookOrderModel
      .find(bookFilter)
      .select("_id total_amount status paid_at created_at")
      .lean();

    // 3. Get Indicator Orders
    // ---------------------------------------------------------
    const indicatorFilter: any = {
      user_id: studentId,
    };
    // Note: Indicator status might be different enum, need mapping if strictly filtering
    // Assuming PENDING/PAID/FAILED are common or mapped
    if (status) indicatorFilter.status = status;

    const indicatorOrdersPromise = this.indicatorSubscriptionModel
      .find(indicatorFilter)
      .populate("indicator_id", "name price_monthly")
      .select("indicator_id status start_at created_at")
      .lean();

    // Execute queries in parallel
    const [courseOrders, bookOrders, indicatorOrders] = await Promise.all([
      courseOrdersPromise,
      bookOrdersPromise,
      indicatorOrdersPromise,
    ]);

    // 4. Normalize Data
    // ---------------------------------------------------------
    const normalizedOrders = [];

    // Map Course Orders
    for (const order of courseOrders) {
      normalizedOrders.push({
        _id: order._id.toString(),
        type: "COURSE",
        name: (order.course_id as any)?.title
          ? `[Khóa học] ${(order.course_id as any)?.title}`
          : "Khóa học",
        amount: order.amount,
        status: order.status,
        date: order.paid_at || order.created_at,
        created_at: order.created_at,
      });
    }

    // Map Book Orders
    // Need to fetch book titles for each order
    const bookOrderIds = bookOrders.map((o) => o._id);
    const bookOrderItems = await this.bookOrderItemModel
      .find({ order_id: { $in: bookOrderIds } })
      .select("order_id book_title")
      .lean();

    for (const order of bookOrders) {
      const items = bookOrderItems.filter(
        (i) => i.order_id.toString() === order._id.toString(),
      );
      const name =
        items.length > 0
          ? items.map((i) => i.book_title).join(", ")
          : "Sách điện tử";

      normalizedOrders.push({
        _id: order._id.toString(),
        type: "BOOK",
        name: `[Sách] ${name}`,
        amount: order.total_amount,
        status: order.status,
        date: order.paid_at || order.created_at,
        created_at: order.created_at,
      });
    }

    // Map Indicator Orders
    for (const order of indicatorOrders) {
      const indicator = order.indicator_id as any;
      normalizedOrders.push({
        _id: order._id.toString(),
        type: "INDICATOR",
        name: `[Indicator] ${indicator?.name || "Indicator"}`,
        amount: indicator?.price_monthly || 0,
        status: order.status,
        date: order.start_at || order.created_at,
        created_at: order.created_at,
      });
    }

    // 5. Sort & Paginate
    // ---------------------------------------------------------
    normalizedOrders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const total = normalizedOrders.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedOrders = normalizedOrders.slice(
      startIndex,
      startIndex + limit,
    );

    return {
      data: paginatedOrders,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
