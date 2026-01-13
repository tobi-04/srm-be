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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto, UpdateCourseDto, SearchCourseDto } from './dto/course.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(@Body() createCourseDto: CreateCourseDto) {
    console.log('📝 POST /courses - Creating course:', createCourseDto);
    const result = await this.courseService.create(createCourseDto);
    console.log('✅ POST /courses - Course created:', result);
    return result;
  }

  @Post('bulk')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple courses (Admin only)' })
  @ApiBody({ type: [CreateCourseDto] })
  @ApiResponse({ status: 201, description: 'Courses created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createMany(@Body() createCourseDtos: CreateCourseDto[]) {
    return this.courseService.createMany(createCourseDtos);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get all courses with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sort', required: false, type: String, example: 'created_at' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll(@Query() paginationDto: PaginationDto, @Request() req: any) {
    const searchDto: SearchCourseDto = {
      status: paginationDto.status as any,
      category: paginationDto.category,
      minPrice: paginationDto.minPrice,
      maxPrice: paginationDto.maxPrice,
    };

    // Check if user is admin
    const isAdmin = req.user?.role === 'admin';

    console.log('🔍 GET /courses - User:', req.user);
    console.log('🔍 GET /courses - isAdmin:', isAdmin);
    console.log('🔍 GET /courses - filters:', searchDto);

    return this.courseService.findAll(paginationDto, searchDto, isAdmin);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'admin';
    return this.courseService.findOne(id, isAdmin);
  }

  @Get('slug/:slug')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get a course by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findBySlug(@Param('slug') slug: string, @Request() req: any) {
    const isAdmin = req.user?.role === 'admin';
    return this.courseService.findBySlug(slug, isAdmin);
  }

  @Put(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a course (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Course deleted successfully (soft delete)' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async remove(@Param('id') id: string) {
    await this.courseService.remove(id);
  }

  @Delete('bulk/delete')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete multiple courses (Admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 204, description: 'Courses deleted successfully (soft delete)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async removeMany(@Body('ids') ids: string[]) {
    await this.courseService.removeMany(ids);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a course (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Course permanently deleted' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async hardDelete(@Param('id') id: string) {
    await this.courseService.hardDelete(id);
  }

  @Put(':id/restore')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft-deleted course (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course restored successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async restore(@Param('id') id: string) {
    return this.courseService.restore(id);
  }
}
