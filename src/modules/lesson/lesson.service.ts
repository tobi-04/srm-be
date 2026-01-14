import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { LessonRepository } from './lesson.repository';
import { LessonFileService } from './lesson-file.service';
import { CreateLessonDto, UpdateLessonDto, SearchLessonDto } from './dto/lesson.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly lessonFileService: LessonFileService,
  ) {}

  async create(createLessonDto: CreateLessonDto) {
    try {
      const lesson = await this.lessonRepository.create(createLessonDto as any);
      return lesson;
    } catch (error) {
      throw new BadRequestException('Failed to create lesson');
    }
  }

  async findAll(
    paginationDto: PaginationDto,
    searchDto: SearchLessonDto,
    isAdmin: boolean = false,
  ) {
    const { page, limit, sort, order, search } = paginationDto;
    const { status, course_id } = searchDto;

    const filter: any = {};

    // If not admin, only show published lessons
    if (!isAdmin) {
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (course_id) {
      filter.course_id = course_id;
    }

    const result = await this.lessonRepository.paginate(filter, {
      page,
      limit,
      sort: sort || 'order',
      order: order || 'asc',
      search,
      searchFields: ['title', 'description'],
      useCache: false,
      cacheTTL: 0,
      includeDeleted: isAdmin,
    });

    return result;
  }

  async findOne(id: string, isAdmin: boolean = false) {
    const lesson = await this.lessonRepository.findById(id, {
      useCache: true,
      cacheTTL: 600,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // If not admin and lesson is draft, deny access
    if (!isAdmin && lesson.status === 'draft') {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async findByCourseId(courseId: string, isAdmin: boolean = false) {
    if (isAdmin) {
      return this.lessonRepository.findByCourseId(courseId, true);
    }
    return this.lessonRepository.findPublishedByCourseId(courseId);
  }

  async update(id: string, updateLessonDto: UpdateLessonDto) {
    const lesson = await this.lessonRepository.updateById(id, updateLessonDto as any);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async updateMany(ids: string[], updateLessonDto: UpdateLessonDto) {
    return this.lessonRepository.updateMany({ _id: { $in: ids } }, updateLessonDto as any);
  }

  async remove(id: string) {
    const lesson = await this.lessonRepository.deleteById(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return { message: 'Lesson deleted successfully' };
  }

  async removeMany(ids: string[]) {
    return this.lessonRepository.deleteMany({ _id: { $in: ids } });
  }

  async hardDelete(id: string) {
    // Delete associated files from R2 and database
    await this.lessonFileService.deleteByLessonId(id);

    const lesson = await this.lessonRepository.hardDeleteById(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return { message: 'Lesson permanently deleted' };
  }

  async hardDeleteMany(ids: string[]) {
    // Delete associated files from R2 and database for all lessons
    await this.lessonFileService.deleteByLessonIds(ids);

    return this.lessonRepository.hardDeleteMany({ _id: { $in: ids } });
  }

  async restoreMany(ids: string[]) {
    return this.lessonRepository.updateMany(
      { _id: { $in: ids }, is_deleted: true },
      { is_deleted: false } as any
    );
  }

  async restore(id: string) {
    const lesson = await this.lessonRepository.restore(id);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async updateOrder(id: string, newOrder: number) {
    const lesson = await this.lessonRepository.updateOrder(id, newOrder);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }
}
