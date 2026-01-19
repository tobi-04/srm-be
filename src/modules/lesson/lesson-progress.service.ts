import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  LessonProgress,
  LessonProgressDocument,
  LessonProgressStatus,
} from "./entities/lesson-progress.entity";

@Injectable()
export class LessonProgressService {
  constructor(
    @InjectModel(LessonProgress.name)
    private lessonProgressModel: Model<LessonProgressDocument>,
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
   * Update progress for a lesson
   */
  async updateProgress(
    userId: string,
    lessonId: string,
    data: {
      watch_time?: number;
      last_position?: number;
      status?: LessonProgressStatus;
    },
  ): Promise<LessonProgress | null> {
    const updateObj: any = {
      updated_at: new Date(),
    };

    if (data.watch_time !== undefined) {
      updateObj.watch_time = data.watch_time;
    }
    if (data.last_position !== undefined) {
      updateObj.last_position = data.last_position;
    }
    if (data.status !== undefined) {
      updateObj.status = data.status;
      if (
        data.status === LessonProgressStatus.IN_PROGRESS &&
        !updateObj.started_at
      ) {
        updateObj.started_at = new Date();
      }
      if (data.status === LessonProgressStatus.COMPLETED) {
        updateObj.completed_at = new Date();
      }
    }

    return this.lessonProgressModel.findOneAndUpdate(
      { user_id: userId, lesson_id: lessonId, is_deleted: false },
      { $set: updateObj },
      { new: true },
    );
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
    return this.lessonProgressModel.findOneAndUpdate(
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
