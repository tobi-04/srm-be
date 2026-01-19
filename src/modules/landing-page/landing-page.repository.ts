import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LandingPage } from "./entities/landing-page.entity";
import { UserFormSubmission } from "./entities/user-form-submission.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class LandingPageRepository extends BaseRepository<LandingPage> {
  protected readonly modelName = "LandingPage";

  constructor(
    @InjectModel(LandingPage.name) protected readonly model: Model<LandingPage>,
    @InjectModel(UserFormSubmission.name)
    private readonly userFormSubmissionModel: Model<UserFormSubmission>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find landing page by slug
   */
  async findBySlug(slug: string, useCache = true): Promise<LandingPage | null> {
    return this.findOne({ slug } as any, {
      useCache,
      cacheTTL: 600,
      populate: ["course_id"],
    });
  }

  /**
   * Find landing pages by course ID
   */
  async findByCourseId(
    courseId: string,
    useCache = true,
  ): Promise<LandingPage[]> {
    const query = { course_id: courseId } as any;
    const result = await this.paginate(query, {
      page: 1,
      limit: 100,
      useCache,
      cacheTTL: 300,
    });
    return result.data;
  }

  /**
   * Find published landing page by slug (for public view)
   */
  async findPublishedBySlug(slug: string): Promise<LandingPage | null> {
    return this.findOne({ slug, status: "published" } as any, {
      useCache: true,
      cacheTTL: 600,
      populate: ["course_id"],
    });
  }

  /**
   * Save user form submission
   */
  async saveUserFormSubmission(
    data: Partial<UserFormSubmission>,
  ): Promise<UserFormSubmission> {
    const submission = new this.userFormSubmissionModel(data);
    return submission.save();
  }

  /**
   * Find user form submission by ID
   */
  async findUserSubmissionById(
    submissionId: string,
  ): Promise<UserFormSubmission | null> {
    return this.userFormSubmissionModel.findById(submissionId);
  }

  /**
   * Find user form submission by email and landing page ID
   */
  async findUserSubmissionByEmail(
    email: string,
    landingPageId: string,
  ): Promise<UserFormSubmission | null> {
    return this.userFormSubmissionModel.findOne({
      email,
      landing_page_id: landingPageId,
      is_deleted: false,
    });
  }

  /**
   * Update user form submission
   */
  async updateUserSubmission(
    submissionId: string,
    data: Partial<UserFormSubmission>,
  ): Promise<UserFormSubmission> {
    const updated = await this.userFormSubmissionModel.findByIdAndUpdate(
      submissionId,
      {
        ...data,
        updated_at: new Date(),
      },
      { new: true },
    );

    if (!updated) {
      throw new Error("Submission not found");
    }

    return updated;
  }

  /**
   * Find user form submissions by landing page ID
   */
  async findUserFormSubmissionsByLandingPageId(
    landingPageId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: UserFormSubmission[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = { landing_page_id: landingPageId, is_deleted: false };

    const [data, total] = await Promise.all([
      this.userFormSubmissionModel
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userFormSubmissionModel.countDocuments(query),
    ]);

    return { data, total };
  }
}
