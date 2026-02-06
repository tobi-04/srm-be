import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LandingPage } from "./entities/landing-page.entity";
import { UserFormSubmission } from "./entities/user-form-submission.entity";
import { Course } from "../course/entities/course.entity";
import { BaseRepository } from "../../common/repositories/base.repository";
import { RedisCacheService } from "../../common/cache/redis-cache.service";

@Injectable()
export class LandingPageRepository extends BaseRepository<LandingPage> {
  protected readonly modelName = "LandingPage";

  constructor(
    @InjectModel(LandingPage.name) protected readonly model: Model<LandingPage>,
    @InjectModel(UserFormSubmission.name)
    private readonly userFormSubmissionModel: Model<UserFormSubmission>,
    @InjectModel(Course.name)
    public readonly courseModel: Model<Course>,
    cacheService: RedisCacheService,
  ) {
    super(cacheService);
  }

  /**
   * Find landing page by slug
   */
  async findBySlug(slug: string, useCache = true): Promise<LandingPage | null> {
    return this.findOne({ slug } as any, {
      useCache: false, // Temporarily disable cache to force populate
      cacheTTL: 600,
      populate: ["course_id", "book_id", "indicator_id"],
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

  async findByBookId(bookId: string, useCache = true): Promise<LandingPage[]> {
    const query = { book_id: bookId, resource_type: "book" } as any;
    const result = await this.paginate(query, {
      page: 1,
      limit: 100,
      useCache,
      cacheTTL: 300,
    });
    return result.data;
  }

  async findByIndicatorId(
    indicatorId: string,
    useCache = true,
  ): Promise<LandingPage[]> {
    const query = {
      indicator_id: indicatorId,
      resource_type: "indicator",
    } as any;
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
      populate: ["course_id", "book_id", "indicator_id"],
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
   * Find user form submission by email
   */
  async findUserSubmissionByEmail(
    email: string,
  ): Promise<UserFormSubmission | null> {
    return this.userFormSubmissionModel.findOne({
      email,
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

  /**
   * Find user form submissions by saler ID with pagination
   */
  async findUserFormSubmissionsBySalerId(
    salerId: string,
    options: {
      page?: number;
      limit?: number;
      excludeSubmissionIds?: string[];
    } = {},
  ): Promise<{ data: any[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      saler_id: salerId,
      is_deleted: false,
    };

    // Exclude submissions that already have orders (to avoid duplicates)
    if (options.excludeSubmissionIds?.length) {
      filter._id = {
        $nin: options.excludeSubmissionIds.map((id) => id),
      };
    }

    const [data, total] = await Promise.all([
      this.userFormSubmissionModel
        .find(filter)
        .populate({
          path: "landing_page_id",
          select: "title course_id",
          populate: {
            path: "course_id",
            select: "title slug price",
          },
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userFormSubmissionModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }
}
