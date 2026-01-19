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
    // Check if landing page already exists for this course
    const existingLandingPages = await this.findByCourseId(
      createLandingPageDto.course_id,
    );
    if (existingLandingPages && existingLandingPages.length > 0) {
      throw new BadRequestException(
        "A landing page already exists for this course",
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
    const landingPage = await this.landingPageRepository.findBySlug(slug);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
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
    // Find the landing page by slug
    const landingPage =
      await this.landingPageRepository.findPublishedBySlug(slug);

    if (!landingPage) {
      throw new NotFoundException("Landing page not found");
    }

    // Normalize email
    const email = submitUserFormDto.email.toLowerCase().trim();

    // Check if user with this email is already enrolled in the course
    const user = await this.userService.findByEmail(email);
    if (user) {
      const isEnrolled = await this.enrollmentService.isUserEnrolled(
        user._id.toString(),
        landingPage.course_id,
      );
      if (isEnrolled) {
        throw new BadRequestException(
          "You are already enrolled in this course.",
        );
      }
    }

    // Check if submission with this email already exists for this landing page
    const existingSubmission =
      await this.landingPageRepository.findUserSubmissionByEmail(
        email,
        landingPage._id.toString(),
      );

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

    if (existingSubmission) {
      // Update existing submission
      const updated = await this.landingPageRepository.updateUserSubmission(
        existingSubmission._id.toString(),
        {
          name: submitUserFormDto.name,
          email: email,
          phone: submitUserFormDto.phone,
          address: submitUserFormDto.address,
          birthday: submitUserFormDto.birthday
            ? new Date(submitUserFormDto.birthday)
            : undefined,
          landing_page_id: landingPage._id.toString(),
          traffic_source_id:
            trafficSourceId || existingSubmission.traffic_source_id,
          session_id:
            submitUserFormDto.session_id || existingSubmission.session_id,
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
    });

    return {
      success: true,
      message: "Form submitted successfully",
      submission_id: submission._id.toString(),
    };
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
}
