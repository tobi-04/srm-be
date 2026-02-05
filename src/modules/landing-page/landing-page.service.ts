import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { LandingPageRepository } from "./landing-page.repository";
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  SearchLandingPageDto,
} from "./dto/landing-page.dto";
import { SubmitUserFormDto } from "./dto/submit-user-form.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CourseEnrollmentService } from "../course-enrollment/course-enrollment.service";
import { UserService } from "../user/user.service";
import { TrafficSourceService } from "../traffic-source/traffic-source.service";
import { SalerDetailsService } from "../saler-details/saler-details.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UserRole } from "../user/entities/user.entity";
import * as bcrypt from "bcryptjs";

@Injectable()
export class LandingPageService {
  constructor(
    private readonly landingPageRepository: LandingPageRepository,
    private readonly enrollmentService: CourseEnrollmentService,
    private readonly userService: UserService,
    private readonly trafficSourceService: TrafficSourceService,
    private readonly salerDetailsService: SalerDetailsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sanitize slug - remove special characters, convert to lowercase
   */
  private sanitizeSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  }

  /**
   * Check if slug is unique (excluding a specific ID if provided)
   */
  private async isSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.landingPageRepository.findBySlug(slug, false);

    if (!existing) {
      return true; // Slug is available
    }

    // If we're updating and the existing slug belongs to the same document, it's okay
    if (excludeId && existing._id.toString() === excludeId) {
      return true;
    }

    return false; // Slug is taken
  }

  /**
   * Generate a unique slug by adding a suffix if needed
   */
  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    const sanitized = this.sanitizeSlug(baseSlug);

    // Check if the base slug is available
    if (await this.isSlugUnique(sanitized, excludeId)) {
      return sanitized;
    }

    // If not, try adding a numeric suffix
    let counter = 1;
    let candidateSlug = `${sanitized}-${counter}`;

    while (!(await this.isSlugUnique(candidateSlug, excludeId))) {
      counter++;
      candidateSlug = `${sanitized}-${counter}`;

      // Safety limit to prevent infinite loops
      if (counter > 1000) {
        throw new BadRequestException("Unable to generate unique slug");
      }
    }

    return candidateSlug;
  }

  async create(createLandingPageDto: CreateLandingPageDto) {
    // Check if landing page already exists for this resource
    let existingLandingPages: any[] = [];

    if (
      createLandingPageDto.resource_type === "book" &&
      createLandingPageDto.book_id
    ) {
      existingLandingPages = await this.landingPageRepository.findByBookId(
        createLandingPageDto.book_id,
      );
    } else if (
      createLandingPageDto.resource_type === "indicator" &&
      createLandingPageDto.indicator_id
    ) {
      existingLandingPages = await this.landingPageRepository.findByIndicatorId(
        createLandingPageDto.indicator_id,
      );
    } else if (createLandingPageDto.course_id) {
      existingLandingPages = await this.landingPageRepository.findByCourseId(
        createLandingPageDto.course_id,
      );
    }

    if (existingLandingPages && existingLandingPages.length > 0) {
      throw new BadRequestException(
        "A landing page already exists for this resource",
      );
    }

    // Use provided slug or generate from title
    const baseSlug = createLandingPageDto.slug || createLandingPageDto.title;

    // Ensure slug is unique
    const slug = await this.ensureUniqueSlug(baseSlug);

    try {
      const landingPage = await this.landingPageRepository.create({
        ...createLandingPageDto,
        slug,
      } as any);

      return landingPage;
    } catch (error) {
      throw new BadRequestException("Failed to create landing page");
    }
  }

  async findAll(
    paginationDto: PaginationDto,
    searchDto: SearchLandingPageDto,
    isAdmin: boolean = false,
  ) {
    const { page, limit, sort, order, search } = paginationDto;
    const { course_id, status } = searchDto;

    const filter: any = {};

    // If not admin, only show published landing pages
    if (!isAdmin) {
      filter.status = "published";
    } else if (status) {
      filter.status = status;
    }

    if (course_id) filter.course_id = course_id;
    if (searchDto.book_id) filter.book_id = searchDto.book_id;
    if (searchDto.indicator_id) filter.indicator_id = searchDto.indicator_id;

    const result = await this.landingPageRepository.paginate(filter, {
      page,
      limit,
      sort: sort || "created_at",
      order,
      search,
      searchFields: ["title", "slug"],
      useCache: true,
      cacheTTL: 300,
      includeDeleted: false, // Never include soft-deleted items
    });

    return result;
  }

  async findOne(id: string, isAdmin: boolean = false) {
    const landingPage = await this.landingPageRepository.findById(id, {
      useCache: true,
      cacheTTL: 600,
      populate: ["course_id", "book_id", "indicator_id"],
    });

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    // If not admin and landing page is draft, deny access
    if (!isAdmin && landingPage.status === "draft") {
      throw new NotFoundException("Landing page not found");
    }

    return landingPage;
  }

  async findBySlug(slug: string, isAdmin: boolean = false) {
    let landingPage = await this.landingPageRepository.findBySlug(slug);

    // If not found by slug, try by ID if it's a valid ObjectId
    if (!landingPage && /^[0-9a-fA-F]{24}$/.test(slug)) {
      landingPage = await this.landingPageRepository.findById(slug, {
        populate: ["course_id"],
      });
    }

    // If still not found, try finding a published landing page by course_id
    if (!landingPage && /^[0-9a-fA-F]{24}$/.test(slug)) {
      const landingPages = await this.landingPageRepository.findByCourseId(
        slug,
        true,
      );
      if (landingPages && landingPages.length > 0) {
        // Find published one if exists, otherwise take first
        landingPage =
          landingPages.find((lp) => lp.status === "published") ||
          landingPages[0];
        // Force populate course_id for this path
        if (landingPage && typeof landingPage.course_id === "string") {
          landingPage = await this.landingPageRepository.findById(
            landingPage._id.toString(),
            { populate: ["course_id"] },
          );
        }
      }
    }

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    // If not admin and landing page is draft, deny access
    if (!isAdmin && landingPage.status === "draft") {
      throw new NotFoundException("Landing page not found");
    }

    return landingPage;
  }

  async findByCourseSlug(courseSlug: string, isAdmin: boolean = false) {
    // Find course by slug
    const course = await this.landingPageRepository.courseModel
      .findOne({ slug: courseSlug })
      .exec();

    if (!course) {
      throw new NotFoundException(`Course with slug "${courseSlug}" not found`);
    }

    // Find landing page by course_id
    const landingPage = await this.landingPageRepository.findOne(
      { course_id: course._id } as any,
      {
        populate: ["course_id", "book_id", "indicator_id"],
      },
    );

    if (!landingPage) {
      throw new NotFoundException(
        `Landing page for course "${courseSlug}" not found`,
      );
    }

    // If not admin and landing page is draft, deny access
    if (!isAdmin && landingPage.status === "draft") {
      throw new NotFoundException("Landing page not found");
    }

    return landingPage;
  }

  async findByCourseId(courseId: string) {
    return this.landingPageRepository.findByCourseId(courseId);
  }

  async update(id: string, updateLandingPageDto: UpdateLandingPageDto) {
    const existingLandingPage = await this.landingPageRepository.findById(id);
    if (!existingLandingPage) {
      throw new NotFoundException("Landing page not found");
    }

    const updateData: any = { ...updateLandingPageDto };

    // If slug is being updated, ensure it's unique
    if (
      updateLandingPageDto.slug &&
      updateLandingPageDto.slug !== existingLandingPage.slug
    ) {
      updateData.slug = await this.ensureUniqueSlug(
        updateLandingPageDto.slug,
        id,
      );
    }

    const landingPage = await this.landingPageRepository.updateById(
      id,
      updateData,
    );

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    return landingPage;
  }

  async remove(id: string) {
    const landingPage = await this.landingPageRepository.deleteById(id);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    return { message: "Landing page deleted successfully" };
  }

  async removeMany(ids: string[]) {
    return this.landingPageRepository.deleteMany({ _id: { $in: ids } });
  }

  async hardDeleteMany(ids: string[]) {
    return this.landingPageRepository.hardDeleteMany({ _id: { $in: ids } });
  }

  async hardDelete(id: string) {
    const landingPage = await this.landingPageRepository.hardDeleteById(id);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    return { message: "Landing page permanently deleted" };
  }

  async restore(id: string) {
    const landingPage = await this.landingPageRepository.restore(id);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    return landingPage;
  }

  /**
   * Submit user form data - check for existing email and update if exists
   */
  async submitUserForm(slug: string, submitUserFormDto: SubmitUserFormDto) {
    // Find the landing page by slug or ID
    const landingPage = await this.findBySlug(slug, false);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    // Normalize email
    const email = submitUserFormDto.email.toLowerCase().trim();

    // Check if user with this email is already enrolled in the course
    const user = await this.userService.findByEmail(email);
    if (user) {
      // Check if user has a non-student role (Admin or Sale)
      if (user.role !== "user") {
        throw new BadRequestException(
          "Tài khoản của bạn không có quyền mua khóa học. Vui lòng sử dụng tài khoản học viên.",
        );
      }

      // If resource is not a course, we might handle it differently or throw error
      if (!landingPage.course_id) {
        // Allow purchase if it's strictly a payment flow, but enrollment check makes sense only for courses usually
        // For books, we don't have enrollment service check yet in this method context.
        // Assuming books/indicators don't use this user form flow for now.
        return;
      }

      const courseId =
        typeof landingPage.course_id === "object"
          ? (landingPage.course_id as any)._id.toString()
          : landingPage.course_id.toString();

      const isEnrolled = await this.enrollmentService.isUserEnrolled(
        user._id.toString(),
        courseId,
      );
      if (isEnrolled) {
        throw new BadRequestException(
          "You are already enrolled in this course.",
        );
      }
    }

    // Check if submission with this email already exists
    const existingSubmission =
      await this.landingPageRepository.findUserSubmissionByEmail(email);

    let trafficSourceId: string | undefined;

    // Handle traffic source if provided
    if (submitUserFormDto.traffic_source && submitUserFormDto.session_id) {
      try {
        const trafficSource = await this.trafficSourceService.create({
          utm_source: submitUserFormDto.traffic_source.utm_source,
          utm_medium: submitUserFormDto.traffic_source.utm_medium,
          utm_campaign: submitUserFormDto.traffic_source.utm_campaign,
          utm_content: submitUserFormDto.traffic_source.utm_content,
          utm_term: submitUserFormDto.traffic_source.utm_term,
          landing_page:
            submitUserFormDto.traffic_source.landing_page || `/landing/${slug}`,
          referrer: submitUserFormDto.traffic_source.referrer,
          session_id: submitUserFormDto.session_id,
        });
        trafficSourceId = trafficSource._id.toString();
      } catch (error) {
        // Silently fail - tracking should not block form submission
        console.error("Failed to create traffic source:", error);
      }
    }

    let salerId: string | undefined;

    // Lookup saler if referral code is provided
    if (submitUserFormDto.referral_code) {
      try {
        // Lookup by code_saler (format: AFF{timestamp})
        const salerDetails = await this.salerDetailsService.findByCodeSaler(
          submitUserFormDto.referral_code,
        );
        if (salerDetails) {
          salerId = salerDetails.user_id.toString();
        }
      } catch (error) {
        console.error("Failed to lookup saler by referral code:", error);
      }
    }

    if (existingSubmission) {
      // Update existing submission
      const updated = await this.landingPageRepository.updateUserSubmission(
        existingSubmission._id.toString(),
        {
          name: submitUserFormDto.name,
          email: email,
          phone: submitUserFormDto.phone || existingSubmission.phone,
          address: submitUserFormDto.address || existingSubmission.address,
          birthday: submitUserFormDto.birthday
            ? new Date(submitUserFormDto.birthday)
            : existingSubmission.birthday,
          landing_page_id: landingPage._id.toString(),
          traffic_source_id:
            trafficSourceId || existingSubmission.traffic_source_id,
          session_id:
            submitUserFormDto.session_id || existingSubmission.session_id,
          saler_id: salerId || existingSubmission.saler_id,
          referral_code:
            submitUserFormDto.referral_code || existingSubmission.referral_code,
        },
      );

      return {
        success: true,
        message: "Form updated successfully",
        submission_id: updated._id.toString(),
      };
    }

    // Save new form submission
    const submission = await this.landingPageRepository.saveUserFormSubmission({
      landing_page_id: landingPage._id.toString(),
      name: submitUserFormDto.name,
      email: email,
      phone: submitUserFormDto.phone,
      address: submitUserFormDto.address,
      birthday: submitUserFormDto.birthday
        ? new Date(submitUserFormDto.birthday)
        : undefined,
      traffic_source_id: trafficSourceId,
      session_id: submitUserFormDto.session_id,
      saler_id: salerId,
      referral_code: submitUserFormDto.referral_code,
    });

    return {
      success: true,
      message: "Form submitted successfully",
      submission_id: submission._id.toString(),
    };
  }

  /**
   * Submit user form by course slug - delegates to submitUserForm after finding landing page
   */
  async submitUserFormByCourseSlug(
    courseSlug: string,
    submitUserFormDto: SubmitUserFormDto,
  ) {
    // Find course by slug
    const course = await this.landingPageRepository.courseModel
      .findOne({ slug: courseSlug })
      .exec();

    if (!course) {
      throw new NotFoundException(`Course with slug "${courseSlug}" not found`);
    }

    // Find landing page by course_id
    const landingPage = await this.landingPageRepository.findOne(
      { course_id: course._id } as any,
      {
        populate: ["course_id"],
      },
    );

    if (!landingPage) {
      throw new NotFoundException(
        `Landing page for course "${courseSlug}" not found`,
      );
    }

    // Use the landing page slug to submit the form
    return this.submitUserForm(landingPage.slug, submitUserFormDto);
  }

  /**
   * Get user form submission by ID
   */
  async findUserSubmissionById(submissionId: string) {
    const submission =
      await this.landingPageRepository.findUserSubmissionById(submissionId);
    if (!submission) {
      throw new NotFoundException("Submission not found");
    }
    return submission;
  }

  /**
   * Get user form submissions for a landing page
   */
  async getUserFormSubmissions(landingPageId: string, page = 1, limit = 50) {
    return this.landingPageRepository.findUserFormSubmissionsByLandingPageId(
      landingPageId,
      page,
      limit,
    );
  }

  /**
   * Get user form submissions by saler ID
   */
  async findUserFormSubmissionsBySalerId(
    salerId: string,
    options: {
      page?: number;
      limit?: number;
      excludeSubmissionIds?: string[];
    } = {},
  ) {
    return this.landingPageRepository.findUserFormSubmissionsBySalerId(
      salerId,
      options,
    );
  }
}
