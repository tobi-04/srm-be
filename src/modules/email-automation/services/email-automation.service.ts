import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  EmailAutomation,
  EmailAutomationDocument,
  EventType,
  TriggerType,
  TargetGroup,
} from "../entities/email-automation.entity";
import {
  EmailAutomationStep,
  EmailAutomationStepDocument,
} from "../entities/email-automation-step.entity";
import { EmailLog, EmailLogDocument } from "../entities/email-log.entity";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EmailTemplateService } from "./email-template.service";
import { User, UserDocument, UserRole } from "../../user/entities/user.entity";
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from "../../payment/entities/payment.entity";
import {
  UserFormSubmission,
  UserFormSubmissionDocument,
} from "../../landing-page/entities/user-form-submission.entity";
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
  EnrollmentStatus,
} from "../../course-enrollment/entities/course-enrollment.entity";
import {
  UserBookAccess,
  UserBookAccessDocument,
} from "../../book-store/entities/user-book-access.entity";
import {
  IndicatorSubscription,
  IndicatorSubscriptionDocument,
  SubscriptionStatus,
} from "../../indicator-store/entities/indicator-subscription.entity";
import {
  TrafficSource,
  TrafficSourceDocument,
} from "../../traffic-source/entities/traffic-source.entity";
import { Course, CourseDocument } from "../../course/entities/course.entity";
import { Book, BookDocument } from "../../book-store/entities/book.entity";
import {
  Indicator,
  IndicatorDocument,
} from "../../indicator-store/entities/indicator.entity";
import {
  CreateAutomationDto,
  UpdateAutomationDto,
} from "../dto/automation.dto";
import { CreateStepDto, UpdateStepDto } from "../dto/step.dto";

@Injectable()
export class EmailAutomationService {
  constructor(
    @InjectModel(EmailAutomation.name)
    private automationModel: Model<EmailAutomationDocument>,
    @InjectModel(EmailAutomationStep.name)
    private stepModel: Model<EmailAutomationStepDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    @InjectModel(UserFormSubmission.name)
    private submissionModel: Model<UserFormSubmissionDocument>,
    @InjectModel(CourseEnrollment.name)
    private enrollmentModel: Model<CourseEnrollmentDocument>,
    @InjectModel(UserBookAccess.name)
    private bookAccessModel: Model<UserBookAccessDocument>,
    @InjectModel(IndicatorSubscription.name)
    private subscriptionModel: Model<IndicatorSubscriptionDocument>,
    @InjectModel(TrafficSource.name)
    private trafficSourceModel: Model<TrafficSourceDocument>,
    @InjectModel(EmailLog.name)
    private emailLogModel: Model<EmailLogDocument>,
    @InjectModel(Course.name)
    private courseModel: Model<CourseDocument>,
    @InjectModel(Book.name)
    private bookModel: Model<BookDocument>,
    @InjectModel(Indicator.name)
    private indicatorModel: Model<IndicatorDocument>,
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private templateService: EmailTemplateService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Create new email automation
   */
  async createAutomation(
    dto: CreateAutomationDto,
  ): Promise<EmailAutomationDocument> {
    const automation = new this.automationModel({
      ...dto,
      created_by: new Types.ObjectId(dto.created_by),
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });

    const saved = await automation.save();
    return saved;
  }

  /**
   * Get all automations
   */
  async getAutomations(
    includeInactive = true,
  ): Promise<EmailAutomationDocument[]> {
    const filter: any = { is_deleted: false };
    if (!includeInactive) {
      filter.is_active = true;
    }

    return this.automationModel.find(filter).sort({ created_at: -1 });
  }

  /**
   * Get automation by ID
   */
  async getAutomationById(id: string): Promise<EmailAutomationDocument> {
    const automation = await this.automationModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!automation) {
      throw new NotFoundException("Automation not found");
    }

    return automation;
  }

  /**
   * Update automation
   */
  async updateAutomation(
    id: string,
    dto: UpdateAutomationDto,
  ): Promise<EmailAutomationDocument> {
    const automation = await this.automationModel.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { ...dto, updated_at: new Date() },
      { new: true },
    );

    if (!automation) {
      throw new NotFoundException("Automation not found");
    }

    return automation;
  }

  /**
   * Toggle automation active status
   */
  async toggleActive(id: string): Promise<EmailAutomationDocument> {
    const automation = await this.getAutomationById(id);
    const newActiveStatus = !automation.is_active;

    const updated = await this.automationModel.findByIdAndUpdate(
      id,
      {
        is_active: newActiveStatus,
        updated_at: new Date(),
      },
      { new: true },
    );

    // If activated and it's a group trigger, trigger a one-time broadcast
    if (updated.is_active && updated.trigger_type === TriggerType.GROUP) {
      await this.emailQueue.add("broadcast-dispatcher", {
        automationId: updated._id.toString(),
      });
    }

    return updated;
  }

  /**
   * Get products and target group statistics for dropdowns
   */
  async getProducts() {
    // 1. Get basic product info
    const [courses, books, indicators] = await Promise.all([
      this.courseModel.find({ is_deleted: false }, "title"),
      this.bookModel.find({ is_deleted: false }, "title"),
      this.indicatorModel.find({ is_deleted: false }, "name"),
    ]);

    // 2. Optimized counting using Aggregation
    const [courseCounts, bookCounts, indicatorCounts] = await Promise.all([
      this.enrollmentModel.aggregate([
        { $match: { status: EnrollmentStatus.ACTIVE } },
        { $group: { _id: "$course_id", uniqueUsers: { $addToSet: "$user_id" } } },
        { $project: { count: { $size: "$uniqueUsers" } } },
      ]).exec(),
      this.bookAccessModel.aggregate([
        { $group: { _id: "$book_id", uniqueUsers: { $addToSet: "$user_id" } } },
        { $project: { count: { $size: "$uniqueUsers" } } },
      ]).exec(),
      this.subscriptionModel.aggregate([
        { $match: { status: SubscriptionStatus.ACTIVE } },
        { $group: { _id: "$indicator_id", uniqueUsers: { $addToSet: "$user_id" } } },
        { $project: { count: { $size: "$uniqueUsers" } } },
      ]).exec(),
    ]).catch(err => {
      console.error("Aggregation error:", err);
      return [[], [], []];
    });

    // Convert to maps for O(1) lookup
    const courseCountMap = Object.fromEntries(
      courseCounts.map((c) => [c._id.toString(), c.count]),
    );
    const bookCountMap = Object.fromEntries(
      bookCounts.map((b) => [b._id.toString(), b.count]),
    );
    const indicatorCountMap = Object.fromEntries(
      indicatorCounts.map((i) => [i._id.toString(), i.count]),
    );

    // 3. Get general group counts (Optimized: using indexes)
    // IMPORTANT: Check all active users
    const [totalUsers, salers, enrolledUserIds, bookUserIds, indicatorUserIds] =
      await Promise.all([
        this.userModel.countDocuments({ role: UserRole.USER, is_active: true, is_deleted: false }),
        this.userModel.countDocuments({ role: UserRole.SALE, is_active: true, is_deleted: false }),
        this.enrollmentModel.distinct("user_id", {
          status: EnrollmentStatus.ACTIVE,
        }),
        this.bookAccessModel.distinct("user_id"),
        this.subscriptionModel.distinct("user_id", {
          status: SubscriptionStatus.ACTIVE,
        }),
      ]);

    // Group specific counts
    const [purchasedCount, totalBookPurchased, totalIndicatorPurchased] =
      await Promise.all([
        this.userModel.countDocuments({
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
          _id: { $in: enrolledUserIds },
        }),
        this.userModel.countDocuments({
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
          _id: { $in: bookUserIds },
        }),
        this.userModel.countDocuments({
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
          _id: { $in: indicatorUserIds },
        }),
      ]);

    // Final check for data consistency
    return {
      courses: courses.map((c: any) => {
        const purchased = courseCountMap[c._id.toString()] || 0;
        return {
          id: c._id,
          title: c.title,
          count: purchased,
          unpurchasedCount: Math.max(0, totalUsers - purchased),
        };
      }),
      books: books.map((b: any) => {
        const purchased = bookCountMap[b._id.toString()] || 0;
        return {
          id: b._id,
          title: b.title,
          count: purchased,
          unpurchasedCount: Math.max(0, totalUsers - purchased),
        };
      }),
      indicators: indicators.map((i: any) => {
        const purchased = indicatorCountMap[i._id.toString()] || 0;
        return {
          id: i._id,
          title: i.name || i.title || "N/A",
          count: purchased,
          unpurchasedCount: Math.max(0, totalUsers - purchased),
        };
      }),
      groupCounts: {
        all_students: totalUsers,
        purchased_students: purchasedCount,
        unpurchased_students: Math.max(0, totalUsers - purchasedCount),
        book_purchased_users: totalBookPurchased,
        indicator_purchased_users: totalIndicatorPurchased,
        non_book_purchased_users: Math.max(0, totalUsers - totalBookPurchased),
        non_indicator_purchased_users: Math.max(0, totalUsers - totalIndicatorPurchased),
        salers: salers,
      },
    };
  }

  /**
   * Get user IDs belonging to a target group with optional traffic source filtering
   */
  async getTargetUserIds(
    targetGroup: TargetGroup,
    trafficSources?: string[],
    productId?: string,
  ): Promise<string[]> {
    const userFilter: any = {
      role: UserRole.USER,
      is_active: true,
      is_deleted: false,
    };

    // Filter by traffic sources if provided
    if (trafficSources && trafficSources.length > 0) {
      const sourceIds = await this.trafficSourceModel.distinct("_id", {
        utm_source: { $in: trafficSources },
      });
      userFilter.traffic_source_id = { $in: sourceIds };
    }

    switch (targetGroup) {
      case TargetGroup.ALL_STUDENTS: {
        const users = await this.userModel.find(userFilter);
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.SALERS: {
        const users = await this.userModel.find({
          ...userFilter,
          role: UserRole.SALE,
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.PURCHASED_STUDENTS: {
        // Find user IDs who have at least one enrollment
        const enrolledUserIds = await this.enrollmentModel.distinct("user_id", {
          is_deleted: false,
        });

        const users = await this.userModel.find({
          ...userFilter,
          _id: { $in: enrolledUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.UNPURCHASED_STUDENTS: {
        // Find user IDs who have at least one enrollment
        const enrolledUserIds = await this.enrollmentModel.distinct("user_id", {
          is_deleted: false,
        });

        const users = await this.userModel.find({
          ...userFilter,
          _id: { $nin: enrolledUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.BOOK_PURCHASED_USERS: {
        const bookUserIds = await this.bookAccessModel.distinct("user_id");
        const users = await this.userModel.find({
          ...userFilter,
          _id: { $in: bookUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.INDICATOR_PURCHASED_USERS: {
        const indicatorUserIds = await this.subscriptionModel.distinct(
          "user_id",
          { status: SubscriptionStatus.ACTIVE },
        );
        const users = await this.userModel.find({
          ...userFilter,
          _id: { $in: indicatorUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.NON_BOOK_PURCHASED_USERS: {
        const bookUserIds = await this.bookAccessModel.distinct("user_id");
        const users = await this.userModel.find({
          ...userFilter,
          _id: { $nin: bookUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.NON_INDICATOR_PURCHASED_USERS: {
        const indicatorUserIds = await this.subscriptionModel.distinct(
          "user_id",
          { status: SubscriptionStatus.ACTIVE },
        );
        const users = await this.userModel.find({
          ...userFilter,
          _id: { $nin: indicatorUserIds },
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.SPECIFIC_COURSE_PURCHASED:
      case TargetGroup.SPECIFIC_COURSE_NOT_PURCHASED:
      case TargetGroup.SPECIFIC_BOOK_PURCHASED:
      case TargetGroup.SPECIFIC_BOOK_NOT_PURCHASED:
      case TargetGroup.SPECIFIC_INDICATOR_PURCHASED:
      case TargetGroup.SPECIFIC_INDICATOR_NOT_PURCHASED:
        // Handle mapped from frontend simplified values
        return this.handleSpecificProductGroup(
          targetGroup,
          userFilter,
          productId,
        );

      default:
        return [];
    }
  }

  private async handleSpecificProductGroup(
    targetGroup: string,
    userFilter: any,
    productId?: string,
  ): Promise<string[]> {
    if (!productId) return [];

    const pid = new Types.ObjectId(productId);

    if (targetGroup.includes("course")) {
      const enrolledUserIds = await this.enrollmentModel.distinct("user_id", {
        course_id: pid,
        is_deleted: false,
      });
      const users = await this.userModel.find({
        ...userFilter,
        _id: { [targetGroup.includes("not") ? "$nin" : "$in"]: enrolledUserIds },
      });
      return users.map((u) => u._id.toString());
    }

    if (targetGroup.includes("book")) {
      const bookUserIds = await this.bookAccessModel.distinct("user_id", {
        book_id: pid,
      });
      const users = await this.userModel.find({
        ...userFilter,
        _id: { [targetGroup.includes("not") ? "$nin" : "$in"]: bookUserIds },
      });
      return users.map((u) => u._id.toString());
    }

    if (targetGroup.includes("indicator")) {
      const indicatorUserIds = await this.subscriptionModel.distinct(
        "user_id",
        {
          indicator_id: pid,
          status: SubscriptionStatus.ACTIVE,
        },
      );
      const users = await this.userModel.find({
        ...userFilter,
        _id: {
          [targetGroup.includes("not") ? "$nin" : "$in"]: indicatorUserIds,
        },
      });
      return users.map((u) => u._id.toString());
    }

    return [];
  }

  /**
   * Delete automation (hard delete)
   */
  async deleteAutomation(id: string): Promise<void> {
    const automation = await this.automationModel.findByIdAndDelete(id);

    if (!automation) {
      throw new NotFoundException("Automation not found");
    }

    // Hard delete all steps associated with this automation
    await this.stepModel.deleteMany({
      automation_id: new Types.ObjectId(id),
    });
  }

  /**
   * Get active automations by event type
   */
  async getActiveAutomationsByEvent(
    eventType: EventType,
  ): Promise<EmailAutomationDocument[]> {
    return this.automationModel.find({
      event_type: eventType,
      is_active: true,
      is_deleted: false,
    });
  }

  // ===== STEP MANAGEMENT =====

  /**
   * Add step to automation
   */
  async addStep(dto: CreateStepDto): Promise<EmailAutomationStepDocument> {
    // Validate that at least one scheduling method is provided
    if (
      dto.delay_minutes === undefined &&
      dto.delay_days === undefined &&
      !dto.scheduled_at
    ) {
      throw new BadRequestException(
        "Either delay_minutes, delay_days, or scheduled_at must be provided",
      );
    }

    // Validate automation exists
    await this.getAutomationById(dto.automation_id);

    // Validate templates
    const subjectValidation = this.templateService.validateTemplate(
      dto.subject_template,
    );
    if (!subjectValidation.valid) {
      throw new BadRequestException(
        `Invalid subject template: ${subjectValidation.error}`,
      );
    }

    const bodyValidation = this.templateService.validateTemplate(
      dto.body_template,
    );
    if (!bodyValidation.valid) {
      throw new BadRequestException(
        `Invalid body template: ${bodyValidation.error}`,
      );
    }

    // Convert scheduled_at string to Date if provided
    const stepData: any = {
      ...dto,
      automation_id: new Types.ObjectId(dto.automation_id),
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    };

    if (dto.scheduled_at) {
      stepData.scheduled_at = new Date(dto.scheduled_at);
    }

    const step = new this.stepModel(stepData);

    return step.save();
  }

  /**
   * Get steps for automation
   */
  async getSteps(automationId: string): Promise<EmailAutomationStepDocument[]> {
    return this.stepModel
      .find({
        automation_id: new Types.ObjectId(automationId),
        is_deleted: false,
      })
      .sort({ step_order: 1 });
  }

  /**
   * Get step by ID
   */
  async getStepById(id: string): Promise<EmailAutomationStepDocument> {
    const step = await this.stepModel.findOne({
      _id: id,
      is_deleted: false,
    });

    if (!step) {
      throw new NotFoundException("Step not found");
    }

    return step;
  }

  /**
   * Update step
   */
  async updateStep(
    id: string,
    dto: UpdateStepDto,
  ): Promise<EmailAutomationStepDocument> {
    // Validate templates if provided
    if (dto.subject_template) {
      const validation = this.templateService.validateTemplate(
        dto.subject_template,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid subject template: ${validation.error}`,
        );
      }
    }

    if (dto.body_template) {
      const validation = this.templateService.validateTemplate(
        dto.body_template,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid body template: ${validation.error}`,
        );
      }
    }

    // Convert scheduled_at string to Date if provided
    const updateData: any = { ...dto, updated_at: new Date() };
    if (dto.scheduled_at) {
      updateData.scheduled_at = new Date(dto.scheduled_at);
    }

    const step = await this.stepModel.findOneAndUpdate(
      { _id: id, is_deleted: false },
      updateData,
      { new: true },
    );

    if (!step) {
      throw new NotFoundException("Step not found");
    }

    return step;
  }

  /**
   * Delete step (soft delete)
   */
  async deleteStep(id: string): Promise<void> {
    const result = await this.stepModel.updateOne(
      { _id: id, is_deleted: false },
      { is_deleted: true, updated_at: new Date() },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException("Step not found");
    }
  }

  // ===== LOG MANAGEMENT =====

  /**
   * Get email send history with global/filtered support
   */
  async getEmailHistory(filters: {
    automationId?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    logs: EmailLogDocument[];
    total: number;
    limit: number;
    skip: number;
  }> {
    const filter: any = { is_deleted: false };

    if (filters.automationId) {
      filter.automation_id = new Types.ObjectId(filters.automationId);
    }

    if (filters.status) {
      filter.status = filters.status;
    }

    const limitNum = filters.limit || 50;
    const skipNum = filters.skip || 0;

    const [logs, total] = await Promise.all([
      this.emailLogModel
        .find(filter)
        .populate("user_id", "name email")
        .populate("automation_id", "name")
        .sort({ created_at: -1 })
        .limit(limitNum)
        .skip(skipNum),
      this.emailLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      limit: limitNum,
      skip: skipNum,
    };
  }

  /**
   * Copy existing automation and its steps
   */
  async copyAutomation(id: string, createdBy: string): Promise<EmailAutomationDocument> {
    const original = await this.getAutomationById(id);
    const steps = await this.getSteps(id);

    // 1. Create new automation metadata
    const newAutomation = new this.automationModel({
      ...original.toObject(),
      _id: new Types.ObjectId(),
      name: `${original.name} (copy)`,
      is_active: false,
      created_by: new Types.ObjectId(createdBy),
      created_at: new Date(),
      updated_at: new Date(),
    });

    const savedAutomation = await newAutomation.save();

    // 2. Copy all steps
    const stepPromises = steps.map((step) => {
      const stepData = step.toObject();
      delete stepData._id; // Let Mongo generate new ID
      return this.stepModel.create({
        ...stepData,
        automation_id: savedAutomation._id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    await Promise.all(stepPromises);

    return savedAutomation;
  }

  /**
   * Get users list with advanced filtering and caching
   */
  async getUsersList(filters: {
    page?: number;
    limit?: number;
    search?: string;
    targetGroup?: string;
    productType?: string;
    productId?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Create a cache key based on filters
    const cacheKey = `users_list_${JSON.stringify(filters)}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) return cachedData;

    // Build user filter
    let userFilter: any = {
      role: { $ne: UserRole.ADMIN },
      is_deleted: false,
    };

    if (filters.search) {
      userFilter.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Handle target groups or specific product filtering
    if (filters.targetGroup || filters.productId) {
      const userIds = await this.getTargetUserIds(
        (filters.targetGroup as TargetGroup) || TargetGroup.ALL_STUDENTS,
        [],
        filters.productId,
      );
      userFilter._id = { $in: userIds.map((id) => new Types.ObjectId(id)) };
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(userFilter)
        .select("-password")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(userFilter),
    ]);

    const result = {
      users,
      total,
      page,
      limit,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }
}
