import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CourseRepository } from './course.repository';
import { CreateCourseDto, UpdateCourseDto, SearchCourseDto } from './dto/course.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CourseService {
  constructor(private readonly courseRepository: CourseRepository) {}

  /**
   * Generate unique slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim() + '-' + Date.now();
  }

  async create(createCourseDto: CreateCourseDto) {
    // Check if price is valid
    if (createCourseDto.price < 0) {
      throw new BadRequestException('Price must be greater than or equal to 0');
    }

    // Generate unique slug
    const slug = this.generateSlug(createCourseDto.title);

    try {
      const course = await this.courseRepository.create({
        ...createCourseDto,
        slug,
      } as any);

      return course;
    } catch (error) {
      // Rollback handled by MongoDB transaction if configured
      throw new BadRequestException('Failed to create course');
    }
  }

  async createMany(createCourseDtos: CreateCourseDto[]) {
    const coursesWithSlugs = createCourseDtos.map((dto) => ({
      ...dto,
      slug: this.generateSlug(dto.title),
    }));

    const courses = await this.courseRepository.createMany(coursesWithSlugs as any);
    return courses;
  }

  async findAll(paginationDto: PaginationDto, searchDto: SearchCourseDto, isAdmin: boolean = false) {
    const { page, limit, sort, order, search } = paginationDto;
    const { status, category, minPrice, maxPrice } = searchDto;

    const filter: any = {};

    // If not admin, only show published courses
    if (!isAdmin) {
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (category) filter.category = category;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    const result = await this.courseRepository.paginate(filter, {
      page,
      limit,
      sort: sort || 'created_at',
      order,
      search,
      searchFields: ['title', 'description'],
      useCache: false, // Disable cache for debugging
      cacheTTL: 0,
      includeDeleted: isAdmin, // Admin can see deleted courses
    });

    return result;
  }

  async findOne(id: string, isAdmin: boolean = false) {
    const course = await this.courseRepository.findById(id, {
      useCache: true,
      cacheTTL: 600,
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If not admin and course is draft, deny access
    if (!isAdmin && course.status === 'draft') {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findBySlug(slug: string, isAdmin: boolean = false) {
    const course = await this.courseRepository.findBySlug(slug);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If not admin and course is draft, deny access
    if (!isAdmin && course.status === 'draft') {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    // Validate price if provided
    if (updateCourseDto.price !== undefined && updateCourseDto.price < 0) {
      throw new BadRequestException('Price must be greater than or equal to 0');
    }

    // If title is being updated, regenerate slug
    const updateData: any = { ...updateCourseDto };
    if (updateCourseDto.title) {
      updateData.slug = this.generateSlug(updateCourseDto.title);
    }

    const course = await this.courseRepository.updateById(id, updateData);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async remove(id: string) {
    const course = await this.courseRepository.deleteById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return { message: 'Course deleted successfully' };
  }

  async removeMany(ids: string[]) {
    const deletePromises = ids.map(id => this.courseRepository.deleteById(id));
    await Promise.all(deletePromises);
    return { message: `${ids.length} courses deleted successfully` };
  }

  async hardDelete(id: string) {
    const course = await this.courseRepository.hardDeleteById(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return { message: 'Course permanently deleted' };
  }

  async restore(id: string) {
    const course = await this.courseRepository.restore(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }
}
