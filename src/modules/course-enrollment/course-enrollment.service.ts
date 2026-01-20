import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
  EnrollmentStatus,
} from "./entities/course-enrollment.entity";

@Injectable()
export class CourseEnrollmentService {
  constructor(
    @InjectModel(CourseEnrollment.name)
    private courseEnrollmentModel: Model<CourseEnrollmentDocument>,
  ) {}

  /**
   * Create a new course enrollment
   */
  async createEnrollment(
    userId: string,
    courseId: string,
    paymentTransactionId: string,
  ): Promise<CourseEnrollment> {
    // Check if enrollment already exists
    const existing = await this.courseEnrollmentModel.findOne({
      user_id: userId,
      course_id: courseId,
      is_deleted: false,
    });

    if (existing) {
      throw new BadRequestException("User is already enrolled in this course");
    }

    const enrollment = await this.courseEnrollmentModel.create({
      user_id: userId,
      course_id: courseId,
      payment_transaction_id: paymentTransactionId,
      enrolled_at: new Date(),
      status: EnrollmentStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });

    return enrollment;
  }

  /**
   * Check if user is enrolled in a course
   */
  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const mongoose = require("mongoose");
    const enrollment = await this.courseEnrollmentModel.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      course_id: new mongoose.Types.ObjectId(courseId),
      is_deleted: false,
    });
    console.log(
      "🔍 isUserEnrolled check - userId:",
      userId,
      "courseId:",
      courseId,
      "found:",
      !!enrollment,
    );
    return !!enrollment;
  }

  /**
   * Check if user (by submission) is enrolled in a course
   */
  async isSubmissionEnrolled(
    submissionId: string,
    courseId: string,
  ): Promise<boolean> {
    // This requires joining with PaymentTransaction to get user_form_submission_id
    // For now, we'll use a different approach in the payment service
    return false;
  }

  /**
   * Get enrollment by user and course
   */
  async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<CourseEnrollment | null> {
    return this.courseEnrollmentModel.findOne({
      user_id: userId,
      course_id: courseId,
      is_deleted: false,
    });
  }

  /**
   * Get all enrollments for a user
   */
  async getUserEnrollments(userId: string): Promise<CourseEnrollment[]> {
    return this.courseEnrollmentModel
      .find({
        user_id: userId,
        is_deleted: false,
      })
      .sort({ enrolled_at: -1 });
  }

  /**
   * Get all enrollments for a course
   */
  async getCourseEnrollments(courseId: string): Promise<CourseEnrollment[]> {
    return this.courseEnrollmentModel
      .find({
        course_id: courseId,
        is_deleted: false,
      })
      .sort({ enrolled_at: -1 });
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    userId: string,
    courseId: string,
    status: EnrollmentStatus,
  ): Promise<CourseEnrollment> {
    const enrollment = await this.getEnrollment(userId, courseId);

    if (!enrollment) {
      throw new NotFoundException("Enrollment not found");
    }

    const updated = await this.courseEnrollmentModel.findByIdAndUpdate(
      enrollment._id,
      {
        status,
        updated_at: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException("Enrollment not found");
    }

    return updated;
  }
}
