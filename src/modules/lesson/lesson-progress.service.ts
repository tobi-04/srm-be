import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  LessonProgress,
  LessonProgressDocument,
  LessonProgressStatus,
} from "./entities/lesson-progress.entity";

import { Lesson, LessonDocument } from "./entities/lesson.entity";
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
} from "../course-enrollment/entities/course-enrollment.entity";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectModel(LessonProgress.name)
    private lessonProgressModel: Model<LessonProgressDocument>,
    @InjectModel(Lesson.name)
    private lessonModel: Model<LessonDocument>,
    @InjectModel(CourseEnrollment.name)
    private enrollmentModel: Model<CourseEnrollmentDocument>,
    private cacheService: RedisCacheService,
  ) {}

  /**
   * Get or create progress for a lesson
   */
  async getOrCreateProgress(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    const existing = await this.lessonProgressModel.findOne({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      is_deleted: false,
    });

    if (existing) {
      return existing;
    }

    return this.lessonProgressModel.create({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      status: LessonProgressStatus.NOT_STARTED,
      watch_time: 0,
      last_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });
  }

  /**
   * Helper: Merge overlapping segments
   */
  private mergeSegments(
    segments: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    if (segments.length === 0) return [];

    // Sort by start time
    const sorted = [...segments].sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // If overlap or contiguous
      if (current.end >= next.start) {
        current.end = Math.max(current.end, next.end);
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Helper: Calculate total unique watched time from segments
   */
  private calculateTotalWatchedTime(
    segments: { start: number; end: number }[],
  ): number {
    const merged = this.mergeSegments(segments);
    return merged.reduce((total, s) => total + (s.end - s.start), 0);
  }

  /**
   * Update progress for a lesson
   */
  async updateProgress(
    userId: string,
    lessonId: string,
    data: {
      watch_time?: number;
      last_position?: number;
      duration?: number;
      status?: LessonProgressStatus;
      watched_segments?: { start: number; end: number }[];
      completed?: boolean;
    },
  ): Promise<LessonProgress | null> {
    const progress = await this.lessonProgressModel.findOne({
      user_id: userId,
      lesson_id: lessonId,
      is_deleted: false,
    });

    if (!progress) return null;

    const updateObj: any = {
      updated_at: new Date(),
    };

    // Update duration if provided
    if (data.duration && data.duration > 0) {
      updateObj.duration = data.duration;
    }

    // Update last position if provided
    if (data.last_position !== undefined) {
      updateObj.last_position = data.last_position;
    }

    // Handle watched segments and recalculate progress
    let currentSegments = [...(progress.watched_segments || [])];
    if (data.watched_segments && data.watched_segments.length > 0) {
      currentSegments = [...currentSegments, ...data.watched_segments];
      const mergedSegments = this.mergeSegments(currentSegments);
      updateObj.watched_segments = mergedSegments;

      const totalUniqueTime = this.calculateTotalWatchedTime(mergedSegments);
      updateObj.watch_time = totalUniqueTime;

      const duration = data.duration || progress.duration || 0;
      if (duration > 0) {
        const percent = Math.min(100, (totalUniqueTime / duration) * 100);
        updateObj.progress_percent = percent;

        // Auto completion at 70%
        if (
          percent >= 70 &&
          progress.status !== LessonProgressStatus.COMPLETED
        ) {
          updateObj.status = LessonProgressStatus.COMPLETED;
          updateObj.completed_at = new Date();
        }
      }
    }

    // Manual status update
    if (data.status) {
      updateObj.status = data.status;
      if (
        data.status === LessonProgressStatus.IN_PROGRESS &&
        !progress.started_at
      ) {
        updateObj.started_at = new Date();
      }
      if (
        data.status === LessonProgressStatus.COMPLETED &&
        !progress.completed_at
      ) {
        updateObj.completed_at = new Date();
      }
    }

    // Handle legacy/manual completion flag
    if (data.completed && progress.status !== LessonProgressStatus.COMPLETED) {
      updateObj.status = LessonProgressStatus.COMPLETED;
      updateObj.completed_at = new Date();
    }

    const result = await this.lessonProgressModel.findOneAndUpdate(
      { _id: progress._id },
      { $set: updateObj },
      { new: true },
    );

    if (result) {
      await this.updateCourseEnrollmentProgress(
        userId,
        progress.course_id.toString(),
      );
    }

    return result;
  }

  /**
   * Update CourseEnrollment progress fields (O(1) optimization)
   */
  private async updateCourseEnrollmentProgress(
    userId: string,
    courseId: string,
  ) {
    // Count total published lessons in course
    const totalLessons = await this.lessonModel.countDocuments({
      course_id: courseId,
      status: "published",
      is_deleted: false,
    });

    // Count completed lessons for user
    const completedLessonsCount = await this.lessonProgressModel.countDocuments(
      {
        user_id: userId,
        course_id: courseId,
        status: LessonProgressStatus.COMPLETED,
        is_deleted: false,
      },
    );

    // Find current lesson (last updated or first incomplete)
    const lastActive = await this.lessonProgressModel
      .findOne({ user_id: userId, course_id: courseId, is_deleted: false })
      .sort({ updated_at: -1 })
      .select("lesson_id");

    const progressPercent =
      totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;

    await this.enrollmentModel.updateOne(
      { user_id: userId, course_id: courseId },
      {
        $set: {
          progress_percent: Math.round(progressPercent * 10) / 10,
          completed_lessons_count: completedLessonsCount,
          current_lesson_id: lastActive?.lesson_id,
          last_activity_at: new Date(),
        },
      },
    );

    // Invalidate analytics cache
    await this.cacheService.delByPattern("analytics:*");
  }

  /**
   * Mark lesson as started
   */
  async markAsStarted(
    userId: string,
    courseId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    const progress = await this.getOrCreateProgress(userId, courseId, lessonId);

    if (progress.status === LessonProgressStatus.NOT_STARTED) {
      await this.lessonProgressModel.updateOne(
        { _id: progress._id },
        {
          $set: {
            status: LessonProgressStatus.IN_PROGRESS,
            started_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
      await this.updateCourseEnrollmentProgress(userId, courseId);
    }

    return this.lessonProgressModel.findById(progress._id) as any;
  }

  /**
   * Mark lesson as completed
   */
  async markAsCompleted(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress | null> {
    const result = await this.lessonProgressModel.findOneAndUpdate(
      { user_id: userId, lesson_id: lessonId, is_deleted: false },
      {
        $set: {
          status: LessonProgressStatus.COMPLETED,
          completed_at: new Date(),
          updated_at: new Date(),
        },
      },
      { new: true },
    );

    if (result) {
      await this.updateCourseEnrollmentProgress(
        userId,
        result.course_id.toString(),
      );
    }

    return result;
  }

  /**
   * Get all progress for a user in a course
   */
  async getCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<LessonProgress[]> {
    return this.lessonProgressModel
      .find({
        user_id: userId,
        course_id: courseId,
        is_deleted: false,
      })
      .sort({ created_at: 1 });
  }

  /**
   * Get course progress summary
   */
  async getCourseProgressSummary(
    userId: string,
    courseId: string,
    totalLessons: number,
  ): Promise<{
    completed: number;
    inProgress: number;
    notStarted: number;
    percentComplete: number;
  }> {
    const progress = await this.getCourseProgress(userId, courseId);

    const completed = progress.filter(
      (p) => p.status === LessonProgressStatus.COMPLETED,
    ).length;
    const inProgress = progress.filter(
      (p) => p.status === LessonProgressStatus.IN_PROGRESS,
    ).length;
    const notStarted = totalLessons - completed - inProgress;

    return {
      completed,
      inProgress,
      notStarted,
      percentComplete:
        totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
    };
  }

  /**
   * Get progress for multiple lessons
   */
  async getProgressForLessons(
    userId: string,
    lessonIds: string[],
  ): Promise<Map<string, LessonProgress>> {
    const progress = await this.lessonProgressModel.find({
      user_id: userId,
      lesson_id: { $in: lessonIds },
      is_deleted: false,
    });

    const map = new Map<string, LessonProgress>();
    for (const p of progress) {
      map.set(p.lesson_id.toString(), p);
    }
    return map;
  }
}
