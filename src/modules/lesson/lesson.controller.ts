import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import { CreateLessonDto, UpdateLessonDto, SearchLessonDto } from './dto/lesson.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

@ApiTags('lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lesson (Admin only)' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonService.create(createLessonDto);
  }

  @Put('bulk')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update multiple lessons (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, data: { $ref: '#/components/schemas/UpdateLessonDto' } } } })
  @ApiResponse({ status: 200, description: 'Lessons updated successfully' })
  async updateMany(@Body('ids') ids: string[], @Body('data') data: UpdateLessonDto) {
    return this.lessonService.updateMany(ids, data);
  }

  @Delete('bulk')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete multiple lessons (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 204, description: 'Lessons deleted successfully' })
  async removeMany(@Body('ids') ids: string[]) {
    await this.lessonService.removeMany(ids);
  }

  @Delete('bulk/hard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete multiple lessons (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 204, description: 'Lessons permanently deleted' })
  async hardDeleteMany(@Body('ids') ids: string[]) {
    await this.lessonService.hardDeleteMany(ids);
  }

  @Put('bulk/restore')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore multiple lessons (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: 'Lessons restored successfully' })
  async restoreMany(@Body('ids') ids: string[]) {
    return this.lessonService.restoreMany(ids);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get all lessons with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sort', required: false, type: String, example: 'order' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], example: 'asc' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'course_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
  async findAll(@Query() paginationDto: PaginationDto, @Request() req: any) {
    const searchDto: SearchLessonDto = {
      status: paginationDto.status as any,
      course_id: paginationDto.course_id,
    };

    const isAdmin = req.user?.role === 'admin';

    return this.lessonService.findAll(paginationDto, searchDto, isAdmin);
  }

  @Get('course/:courseId')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get all lessons for a course' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
  async findByCourseId(@Param('courseId') courseId: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'admin';
    return this.lessonService.findByCourseId(courseId, isAdmin);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get a lesson by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'admin';
    return this.lessonService.findOne(id, isAdmin);
  }

  @Put(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async update(@Param('id') id: string, @Body() updateLessonDto: UpdateLessonDto) {
    return this.lessonService.update(id, updateLessonDto);
  }

  @Put(':id/order')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lesson order (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson order updated successfully' })
  async updateOrder(@Param('id') id: string, @Body('order') order: number) {
    return this.lessonService.updateOrder(id, order);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a lesson (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Lesson deleted successfully (soft delete)' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async remove(@Param('id') id: string) {
    await this.lessonService.remove(id);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a lesson (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Lesson permanently deleted' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async hardDelete(@Param('id') id: string) {
    await this.lessonService.hardDelete(id);
  }

  @Put(':id/restore')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft-deleted lesson (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson restored successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async restore(@Param('id') id: string) {
    return this.lessonService.restore(id);
  }
}
