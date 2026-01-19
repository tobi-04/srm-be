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
  StudentProgressResponse,
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
   * Get student's overall progress
   * Cache: 5 minutes
   */
  async getProgress(studentId: string): Promise<StudentProgressResponse> {
    const coursesResponse = await this.getCourses(studentId, {
      page: 1,
      limit: 100,
      status: CourseStatusFilter.ALL,
    });

    const courses = coursesResponse.data;
    const totalCourses = courses.length;
    const completedCourses = courses.filter((c) => c.is_completed).length;
    const completionRate =
      totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

    const totalLessons = courses.reduce((sum, c) => sum + c.total_lessons, 0);
    const completedLessons = courses.reduce(
      (sum, c) => sum + c.completed_lessons,
      0,
    );

    return {
      courses,
      overall_progress: {
        total_courses: totalCourses,
        completed_courses: completedCourses,
        completion_rate: completionRate,
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
      },
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
   * Get student's order history
   * Cache: 5 minutes
   */
  async getOrders(studentId: string, query: StudentOrdersQuery): Promise<any> {
    const { page = 1, limit = 20, status } = query;

    const filter: any = {
      user_id: studentId,
      is_deleted: false,
    };

    if (status) {
      filter.status = status;
    }

    const total = await this.paymentTransactionModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const orders = await this.paymentTransactionModel
      .find(filter)
      .populate("landing_page_id", "title")
      .select("landing_page_id total_amount status paid_at created_at")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
