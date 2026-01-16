import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LandingPageRepository } from './landing-page.repository';
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  SearchLandingPageDto,
} from './dto/landing-page.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class LandingPageService {
  constructor(private readonly landingPageRepository: LandingPageRepository) {}

  /**
   * Sanitize slug - remove special characters, convert to lowercase
   */
  private sanitizeSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  /**
   * Check if slug is unique (excluding a specific ID if provided)
   */
  private async isSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
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
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
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
        throw new BadRequestException('Unable to generate unique slug');
      }
    }

    return candidateSlug;
  }

  async create(createLandingPageDto: CreateLandingPageDto) {
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
      throw new BadRequestException('Failed to create landing page');
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
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (course_id) filter.course_id = course_id;

    const result = await this.landingPageRepository.paginate(filter, {
      page,
      limit,
      sort: sort || 'created_at',
      order,
      search,
      searchFields: ['title', 'slug'],
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
      throw new NotFoundException('Landing page not found');
    }

    // If not admin and landing page is draft, deny access
    if (!isAdmin && landingPage.status === 'draft') {
      throw new NotFoundException('Landing page not found');
    }

    return landingPage;
  }

  async findBySlug(slug: string, isAdmin: boolean = false) {
    const landingPage = await this.landingPageRepository.findBySlug(slug);

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    // If not admin and landing page is draft, deny access
    if (!isAdmin && landingPage.status === 'draft') {
      throw new NotFoundException('Landing page not found');
    }

    return landingPage;
  }

  async findByCourseId(courseId: string) {
    return this.landingPageRepository.findByCourseId(courseId);
  }

  async update(id: string, updateLandingPageDto: UpdateLandingPageDto) {
    const existingLandingPage = await this.landingPageRepository.findById(id);
    if (!existingLandingPage) {
      throw new NotFoundException('Landing page not found');
    }

    const updateData: any = { ...updateLandingPageDto };

    // If slug is being updated, ensure it's unique
    if (updateLandingPageDto.slug && updateLandingPageDto.slug !== existingLandingPage.slug) {
      updateData.slug = await this.ensureUniqueSlug(updateLandingPageDto.slug, id);
    }

    const landingPage = await this.landingPageRepository.updateById(id, updateData);

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    return landingPage;
  }

  async remove(id: string) {
    const landingPage = await this.landingPageRepository.deleteById(id);

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    return { message: 'Landing page deleted successfully' };
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
      throw new NotFoundException('Landing page not found');
    }

    return { message: 'Landing page permanently deleted' };
  }

  async restore(id: string) {
    const landingPage = await this.landingPageRepository.restore(id);

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    return landingPage;
  }
}
