import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SalerDetailsRepository } from "./saler-details.repository";
import { SalerDetails } from "./entities/saler-details.entity";
import {
  UpdateKpiDto,
  AssignCoursesDto,
  UpdateCommissionsDto,
} from "./dto/saler-details.dto";

@Injectable()
export class SalerDetailsService {
  constructor(
    private readonly salerDetailsRepository: SalerDetailsRepository,
    @InjectModel(SalerDetails.name)
    private readonly salerDetailsModel: Model<SalerDetails>,
  ) {}

  /**
   * Generate unique code_saler in format AFF{timestamp}
   */
  private generateCodeSaler(): string {
    return `AFF${Date.now()}`;
  }

  /**
   * Create saler details for a new saler
   */
  async createForSaler(userId: string): Promise<SalerDetails> {
    // Check if already exists
    const existing = await this.salerDetailsRepository.findByUserId(
      userId,
      false,
    );

    if (existing) {
      throw new ConflictException("Saler details already exist for this user");
    }

    // Generate unique code_saler
    let codeSaler = this.generateCodeSaler();
    let attempts = 0;
    const maxAttempts = 5;

    // Ensure uniqueness (very unlikely to collide, but just in case)
    while (attempts < maxAttempts) {
      const existingCode = await this.salerDetailsRepository.findByCodeSaler(
        codeSaler,
        false,
      );

      if (!existingCode) {
        break;
      }

      // Wait a tiny bit and regenerate
      await new Promise((resolve) => setTimeout(resolve, 10));
      codeSaler = this.generateCodeSaler();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new ConflictException("Failed to generate unique code_saler");
    }

    // Create saler details
    const salerDetails = await this.salerDetailsRepository.create({
      user_id: userId,
      code_saler: codeSaler,
      kpi_monthly_target: 0,
      kpi_quarterly_target: 0,
      kpi_yearly_target: 0,
      assigned_courses: [],
      course_commissions: [],
      default_commission_rate: 0,
    } as any);

    return salerDetails;
  }

  /**
   * Get saler details by user ID
   */
  async getSalerDetails(userId: string): Promise<SalerDetails> {
    const details = await this.salerDetailsRepository.findByUserId(userId);

    if (!details) {
      throw new NotFoundException("Saler details not found");
    }

    return details;
  }

  /**
   * Update KPI targets
   */
  async updateKPI(
    userId: string,
    updateKpiDto: UpdateKpiDto,
  ): Promise<SalerDetails> {
    const updated = await this.salerDetailsRepository.updateKPI(
      userId,
      updateKpiDto,
    );

    if (!updated) {
      throw new NotFoundException("Saler details not found");
    }

    return updated;
  }

  /**
   * Assign courses to saler
   */
  async assignCourses(
    userId: string,
    assignCoursesDto: AssignCoursesDto,
  ): Promise<SalerDetails> {
    const updated = await this.salerDetailsRepository.assignCourses(
      userId,
      assignCoursesDto.course_ids,
    );

    if (!updated) {
      throw new NotFoundException("Saler details not found");
    }

    return updated;
  }

  /**
   * Unassign a course from saler
   */
  async unassignCourse(
    userId: string,
    courseId: string,
  ): Promise<SalerDetails> {
    const details = await this.getSalerDetails(userId);

    const updatedCourses = details.assigned_courses.filter(
      (id) => id.toString() !== courseId,
    );

    // Also remove commission for this course
    const updatedCommissions = details.course_commissions.filter(
      (comm) => comm.course_id.toString() !== courseId,
    );

    const updated = await this.salerDetailsModel.findOneAndUpdate(
      { user_id: userId, is_deleted: false },
      {
        assigned_courses: updatedCourses,
        course_commissions: updatedCommissions,
        updated_at: new Date(),
      },
      { new: true },
    );

    // Invalidate cache
    await this.salerDetailsRepository["invalidateCache"]();

    if (!updated) {
      throw new NotFoundException("Saler details not found");
    }

    return updated;
  }

  /**
   * Update commission rates
   */
  async updateCommissions(
    userId: string,
    updateCommissionsDto: UpdateCommissionsDto,
  ): Promise<SalerDetails> {
    const updateData: any = {};

    if (updateCommissionsDto.default_commission_rate !== undefined) {
      updateData.default_commission_rate =
        updateCommissionsDto.default_commission_rate;
    }

    if (updateCommissionsDto.course_commissions !== undefined) {
      updateData.course_commissions = updateCommissionsDto.course_commissions;
    }

    const updated = await this.salerDetailsRepository.updateCommissions(
      userId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException("Saler details not found");
    }

    return updated;
  }

  /**
   * Find saler details by code saler
   */
  async findByCodeSaler(code: string): Promise<SalerDetails | null> {
    return this.salerDetailsRepository.findByCodeSaler(code);
  }
}
