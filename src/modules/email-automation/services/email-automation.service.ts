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
  ScheduleType,
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

export interface CreateAutomationDto {
  name: string;
  description?: string;
  trigger_type?: TriggerType;
  event_type?: EventType;
  target_group?: TargetGroup;
  schedule_type?: ScheduleType;
  cron_expression?: string;
  scheduled_at?: string;
  created_by: string;
}

export interface UpdateAutomationDto {
  name?: string;
  description?: string;
  trigger_type?: TriggerType;
  event_type?: EventType;
  target_group?: TargetGroup;
  schedule_type?: ScheduleType;
  cron_expression?: string;
  scheduled_at?: string;
  is_active?: boolean;
}

export interface CreateStepDto {
  automation_id: string;
  step_order: number;
  delay_minutes: number;
  subject_template: string;
  body_template: string;
}

export interface UpdateStepDto {
  step_order?: number;
  delay_minutes?: number;
  subject_template?: string;
  body_template?: string;
}

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
    @InjectModel(EmailLog.name)
    private emailLogModel: Model<EmailLogDocument>,
    @InjectQueue("email-automation")
    private emailQueue: Queue,
    private templateService: EmailTemplateService
  ) {}

  /**
   * Create new email automation
   */
  async createAutomation(
    dto: CreateAutomationDto
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
    includeInactive = true
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
    dto: UpdateAutomationDto
  ): Promise<EmailAutomationDocument> {
    const automation = await this.automationModel.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { ...dto, updated_at: new Date() },
      { new: true }
    );

    if (!automation) {
      throw new NotFoundException("Automation not found");
    }

    await this.updateAutomationSchedule(automation);

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
      { new: true }
    );

    await this.updateAutomationSchedule(updated);

    return updated;
  }

  /**
   * Manage BullMQ scheduling based on automation config
   */
  private async updateAutomationSchedule(
    automation: EmailAutomationDocument
  ): Promise<void> {
    // Remove existing repeatable job if any
    if (automation.repeat_job_key) {
      await this.emailQueue.removeRepeatableByKey(automation.repeat_job_key);
      await this.automationModel.updateOne(
        { _id: automation._id },
        { repeat_job_key: null }
      );
    }

    // Add new repeatable job if active and recurring
    if (
      automation.is_active &&
      !automation.is_deleted &&
      automation.trigger_type === TriggerType.GROUP &&
      automation.schedule_type === ScheduleType.RECURRING &&
      automation.cron_expression
    ) {
      const job = await this.emailQueue.add(
        "broadcast-dispatcher",
        { automationId: automation._id.toString() },
        {
          repeat: {
            pattern: automation.cron_expression,
          },
        }
      );

      if (job && (job as any).repeatJobKey) {
        await this.automationModel.updateOne(
          { _id: automation._id },
          { repeat_job_key: (job as any).repeatJobKey }
        );
      }
    }
  }

  /**
   * Get user IDs belonging to a target group
   */
  async getTargetUserIds(targetGroup: TargetGroup): Promise<string[]> {
    switch (targetGroup) {
      case TargetGroup.ALL_STUDENTS: {
        const users = await this.userModel.find({
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.SALERS: {
        const users = await this.userModel.find({
          role: UserRole.SALE,
          is_active: true,
          is_deleted: false,
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.PURCHASED_STUDENTS: {
        // Find user IDs who have at least one enrollment
        const enrolledUserIds = await this.enrollmentModel.distinct("user_id", {
          is_deleted: false,
        });

        const users = await this.userModel.find({
          _id: { $in: enrolledUserIds },
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
        });
        return users.map((u) => u._id.toString());
      }

      case TargetGroup.UNPURCHASED_STUDENTS: {
        // Find user IDs who have at least one enrollment
        const enrolledUserIds = await this.enrollmentModel.distinct("user_id", {
          is_deleted: false,
        });

        const users = await this.userModel.find({
          _id: { $nin: enrolledUserIds },
          role: UserRole.USER,
          is_active: true,
          is_deleted: false,
        });
        return users.map((u) => u._id.toString());
      }

      default:
        return [];
    }
  }

  /**
   * Delete automation (soft delete)
   */
  async deleteAutomation(id: string): Promise<void> {
    const automation = await this.automationModel.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { is_deleted: true, updated_at: new Date() },
      { new: true }
    );

    if (!automation) {
      throw new NotFoundException("Automation not found");
    }

    // Remove from BullMQ
    await this.updateAutomationSchedule(automation);

    // Also soft delete all steps
    await this.stepModel.updateMany(
      { automation_id: new Types.ObjectId(id), is_deleted: false },
      { is_deleted: true, updated_at: new Date() }
    );
  }

  /**
   * Get active automations by event type
   */
  async getActiveAutomationsByEvent(
    eventType: EventType
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
    // Validate automation exists
    await this.getAutomationById(dto.automation_id);

    // Validate templates
    const subjectValidation = this.templateService.validateTemplate(
      dto.subject_template
    );
    if (!subjectValidation.valid) {
      throw new BadRequestException(
        `Invalid subject template: ${subjectValidation.error}`
      );
    }

    const bodyValidation = this.templateService.validateTemplate(
      dto.body_template
    );
    if (!bodyValidation.valid) {
      throw new BadRequestException(
        `Invalid body template: ${bodyValidation.error}`
      );
    }

    const step = new this.stepModel({
      ...dto,
      automation_id: new Types.ObjectId(dto.automation_id),
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });

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
    dto: UpdateStepDto
  ): Promise<EmailAutomationStepDocument> {
    // Validate templates if provided
    if (dto.subject_template) {
      const validation = this.templateService.validateTemplate(
        dto.subject_template
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid subject template: ${validation.error}`
        );
      }
    }

    if (dto.body_template) {
      const validation = this.templateService.validateTemplate(
        dto.body_template
      );
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid body template: ${validation.error}`
        );
      }
    }

    const step = await this.stepModel.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { ...dto, updated_at: new Date() },
      { new: true }
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
      { is_deleted: true, updated_at: new Date() }
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
