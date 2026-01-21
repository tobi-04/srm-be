import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { CourseService } from "./course.service";
import { LessonService } from "../lesson/lesson.service";
import { LessonProgressService } from "../lesson/lesson-progress.service";
import { CourseEnrollmentService } from "../course-enrollment/course-enrollment.service";
import { LandingPageRepository } from "../landing-page/landing-page.repository";
import { LessonProgressStatus } from "../lesson/entities/lesson-progress.entity";
import { RedisCacheService } from "../../common/cache/redis-cache.service";
import { UserService } from "../user/user.service";
import { UserRole } from "../user/entities/user.entity";
import { LessonFileService } from "../lesson/lesson-file.service";

interface StudentRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller("student/courses")
@UseGuards(JwtAccessGuard)
export class StudentCourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly lessonService: LessonService,
    private readonly lessonProgressService: LessonProgressService,
    private readonly enrollmentService: CourseEnrollmentService,
    private readonly landingPageRepository: LandingPageRepository,
    private readonly cacheService: RedisCacheService,
    private readonly userService: UserService,
    private readonly lessonFileService: LessonFileService,
  ) {}

  /**
   * Get all enrolled courses for current user
   */
  @Get()
  async getEnrolledCourses(@Req() req: StudentRequest) {
    const userId = req.user.userId;
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const cacheKey = `enrolled:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    let courseIds: string[];
    if (isAdmin) {
      // For Admin, fetch all published courses (or all courses they can access)
      const courses = await this.courseService.findAll(
        { page: 1, limit: 100 },
        {},
        true,
      );
      courseIds = courses.data.map((c: any) => c._id.toString());
    } else {
      const enrollments =
        await this.enrollmentService.getUserEnrollments(userId);
      courseIds = enrollments.map((e) => e.course_id);
    }

    // Fetch course details with progress
    const courses = await Promise.all(
      courseIds.map(async (courseId) => {
        try {
          const course = await this.courseService.findOne(courseId, false);
          const totalLessons = course.lessons?.length || 0;
          const progress =
            await this.lessonProgressService.getCourseProgressSummary(
              userId,
              courseId,
              totalLessons,
            );

          return {
            _id: course._id,
            title: course.title,
            description: course.description,
            slug: course.slug,
            category: course.category,
            totalLessons,
            progress,
          };
        } catch {
          return null;
        }
      }),
    );

    const result = courses.filter(Boolean);

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get course details for enrolled student
   */
  @Get(":courseId")
  async getCourse(
    @Param("courseId") courseId: string,
    @Req() req: StudentRequest,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenException("Bạn cần đăng nhập để xem khóa học");
    }

    const cacheKey = `course:student:${courseId}:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if user is admin (admin can view all courses without enrollment)
    const isAdmin = req.user?.role === UserRole.ADMIN;
    console.log("👤 User role:", req.user?.role, "Is Admin:", isAdmin);

    // Optimized: Run enrollment check and course fetching in parallel
    const [isEnrolled, course] = await Promise.all([
      isAdmin || this.enrollmentService.isUserEnrolled(userId, courseId),
      this.courseService.findOne(courseId, isAdmin),
    ]);

    if (!isEnrolled) {
      // Check if landing page exists for redirection
      const landingPages =
        await this.landingPageRepository.findByCourseId(courseId);
      const landingPage = landingPages.length > 0 ? landingPages[0] : null;

      throw new ForbiddenException({
        message: "Bạn chưa đăng ký khóa học này",
        code: "NOT_ENROLLED",
        redirectTo: landingPage ? `/landing/${landingPage.slug}` : null,
      });
    }

    const visibleLessons = (course.lessons || []).filter(
      (l: any) => l.status === "published",
    );

    // Get progress for visible lessons in parallel with other info if possible,
    const lessonIds = visibleLessons.map((l: any) => l._id.toString());
    const [progressMap, progressSummary] = await Promise.all([
      this.lessonProgressService.getProgressForLessons(userId, lessonIds),
      this.lessonProgressService.getCourseProgressSummary(
        userId,
        courseId,
        visibleLessons.length,
      ),
    ]);

    // Sort lessons by order to determine locking
    const sortedLessons = [...visibleLessons].sort((a, b) => a.order - b.order);

    // Add progress and locking logic
    let firstLockedFound = false;
    let autoResumeLessonId: string | null = null;

    const lessonsWithProgress = sortedLessons.map(
      (lesson: any, index: number) => {
        const progress = progressMap.get(lesson._id.toString()) || {
          status: LessonProgressStatus.NOT_STARTED,
          watch_time: 0,
          last_position: 0,
        };

        // Sequential Locking:
        // A lesson is LOCKED if:
        // 1. It's not the first lesson AND
        // 2. The previous lesson is NOT completed
        let isLocked = false;
        if (index > 0) {
          const prevLesson = sortedLessons[index - 1];
          const prevProgress = progressMap.get(prevLesson._id.toString());
          if (
            !prevProgress ||
            prevProgress.status !== LessonProgressStatus.COMPLETED
          ) {
            isLocked = true;
          }
        }

        // Admin can still bypass in navigateToLesson, but we show the lock in UI
        // if (isAdmin) isLocked = false;

        // Determine Auto-Resume Lesson:
        // The first lesson that is "in_progress" OR the first "not_started" that is not locked.
        if (!autoResumeLessonId && !isLocked) {
          if (progress.status === LessonProgressStatus.IN_PROGRESS) {
            autoResumeLessonId = lesson._id.toString();
          } else if (progress.status === LessonProgressStatus.NOT_STARTED) {
            autoResumeLessonId = lesson._id.toString();
          }
        }

        return {
          _id: lesson._id,
          title: lesson.title,
          description: lesson.description,
          video: lesson.video,
          order: lesson.order,
          chapter_index: lesson.chapter_index || 0,
          status: lesson.status,
          is_locked: isLocked, // New field for sequential locking
          progress,
        };
      },
    );

    // If all lessons are completed, auto resume to the last lesson or first
    if (!autoResumeLessonId && lessonsWithProgress.length > 0) {
      autoResumeLessonId = lessonsWithProgress[0]._id;
    }

    const result = {
      _id: course._id,
      title: course.title,
      description: course.description,
      slug: course.slug,
      category: course.category,
      syllabus: course.syllabus,
      lessons: lessonsWithProgress,
      totalLessons: visibleLessons.length,
      progress: progressSummary,
      autoResumeLessonId, // New field for frontend to jump to
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600);

    return result;
  }

  /**
   * Get specific lesson content
   */
  @Get(":courseId/lessons/:lessonId")
  async getLesson(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @Req() req: StudentRequest,
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenException("Bạn cần đăng nhập để xem bài học");
    }

    const cacheKey = `lesson:student:${lessonId}:${userId}`;

    // Check if user is admin
    const isAdmin = req.user?.role === UserRole.ADMIN;

    // Optimized: Fetch all necessary data in parallel
    const [isEnrolled, lesson, files, allLessons] = await Promise.all([
      isAdmin || this.enrollmentService.isUserEnrolled(userId, courseId),
      this.lessonService.findOne(lessonId, isAdmin),
      this.lessonFileService.findByLessonId(lessonId),
      this.lessonService.findByCourseId(courseId, false), // Navigation only for published lessons
    ]);

    if (!isEnrolled) {
      throw new ForbiddenException({
        message: "Bạn chưa đăng ký khóa học này",
        code: "NOT_ENROLLED",
      });
    }

    if (!lesson || lesson.course_id.toString() !== courseId) {
      throw new NotFoundException("Bài học không tồn tại");
    }

    // Double check status for non-admins if findOne allowed it
    if (!isAdmin && lesson.status === "draft") {
      throw new ForbiddenException("Bài học này chưa được công khai");
    }

    // Mark as started and get/create progress
    const progress = await this.lessonProgressService.markAsStarted(
      userId,
      courseId,
      lessonId,
    );

    // Calculate navigation
    const sortedLessons = (allLessons || []).sort(
      (a: any, b: any) => a.order - b.order,
    );
    const currentIndex = sortedLessons.findIndex(
      (l: any) => l._id.toString() === lessonId,
    );

    const prevLesson =
      currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex < sortedLessons.length - 1
        ? sortedLessons[currentIndex + 1]
        : null;

    return {
      _id: lesson._id,
      title: lesson.title,
      description: lesson.description,
      main_content: lesson.main_content,
      video: lesson.video,
      order: lesson.order,
      chapter_index: lesson.chapter_index || 0,
      files: files.map((file) => ({
        _id: file._id,
        name: file.name,
        url: file.url,
        mime: file.mime,
        size: file.size,
      })),
      progress: {
        status: progress.status,
        watch_time: progress.watch_time,
        last_position: progress.last_position,
      },
      navigation: {
        prev: prevLesson
          ? { _id: prevLesson._id, title: prevLesson.title }
          : null,
        next: nextLesson
          ? { _id: nextLesson._id, title: nextLesson.title }
          : null,
        currentIndex: currentIndex + 1,
        total: sortedLessons.length,
      },
    };
  }

  /**
   * Update lesson progress
   */
  @Patch(":courseId/lessons/:lessonId/progress")
  async updateProgress(
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string,
    @Body()
    body: {
      watch_time?: number;
      last_position?: number;
      duration?: number;
      watched_segments?: { start: number; end: number }[];
      completed?: boolean;
    },
    @Req() req: StudentRequest,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user?.role === UserRole.ADMIN;

    // Optimized: Check enrollment (Admin bypasses this)
    const isEnrolled =
      isAdmin ||
      (await this.enrollmentService.isUserEnrolled(userId, courseId));

    if (!isEnrolled) {
      throw new ForbiddenException("Bạn chưa đăng ký khóa học này");
    }

    // Prepare update data
    const updateData: any = {
      watch_time: body.watch_time,
      last_position: body.last_position,
      duration: body.duration,
      watched_segments: body.watched_segments,
      completed: body.completed,
    };

    // Update progress
    const progress = await this.lessonProgressService.updateProgress(
      userId,
      lessonId,
      updateData,
    );

    // Invalidate cache
    await Promise.all([
      this.cacheService.del(`course:student:${courseId}:${userId}`),
      this.cacheService.del(`progress:${userId}:${courseId}`),
    ]);

    return progress;
  }

  /**
   * Get course progress summary
   */
  @Get(":courseId/progress")
  async getProgress(
    @Param("courseId") courseId: string,
    @Req() req: StudentRequest,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const cacheKey = `progress:${userId}:${courseId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check enrollment (Admin bypasses this)
    const isEnrolled =
      isAdmin ||
      (await this.enrollmentService.isUserEnrolled(userId, courseId));

    if (!isEnrolled) {
      throw new ForbiddenException("Bạn chưa đăng ký khóa học này");
    }

    // Get course to count lessons
    const course = await this.courseService.findOne(courseId, false);
    const totalLessons = course.lessons?.length || 0;

    const progress = await this.lessonProgressService.getCourseProgressSummary(
      userId,
      courseId,
      totalLessons,
    );

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, progress, 300);

    return progress;
  }
}
