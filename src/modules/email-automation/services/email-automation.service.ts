import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
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
} from "../../course-enrollment/entities/course-enrollment.entity";
import {
  TrafficSource,
  TrafficSourceDocument,
} from "../../traffic-source/entities/traffic-source.entity";
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
    @InjectModel(TrafficSource.name)
    private trafficSourceModel: Model<TrafficSourceDocument>,
    @InjectModel(EmailLog.name)
    private emailLogModel: Model<EmailLogDocument>,
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private templateService: EmailTemplateService,
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
   * Get user IDs belonging to a target group with optional traffic source filtering
   */
  async getTargetUserIds(
    targetGroup: TargetGroup,
    trafficSources?: string[],
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

      default:
        return [];
    }
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
}
