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
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { LandingPageService } from "./landing-page.service";
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  SearchLandingPageDto,
  GetLandingPagesDto,
} from "./dto/landing-page.dto";
import { SubmitUserFormDto } from "./dto/submit-user-form.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

@ApiTags("landing-pages")
@Controller("landing-pages")
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Post()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new landing page (Admin or auto-create)" })
  @ApiResponse({
    status: 201,
    description: "Landing page created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only for manual creation" })
  async create(
    @Body() createLandingPageDto: CreateLandingPageDto,
    @Request() req: any,
  ) {
    console.log(
      "📝 POST /landing-pages - Creating landing page:",
      createLandingPageDto,
    );

    // If user is not admin, only allow auto-create with status = draft
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && createLandingPageDto.status !== "draft") {
      throw new BadRequestException(
        "Only admins can create published landing pages",
      );
    }

    const result = await this.landingPageService.create(createLandingPageDto);
    console.log("✅ POST /landing-pages - Landing page created:", result);
    return result;
  }

  @Post("slug/:slug/submit-form")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit user form for a landing page (Public)" })
  @ApiParam({ name: "slug", type: String, description: "Landing page slug" })
  @ApiResponse({ status: 200, description: "Form submitted successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  async submitUserForm(
    @Param("slug") slug: string,
    @Body() submitUserFormDto: SubmitUserFormDto,
  ) {
    console.log(
      "📝 POST /landing-pages/:slug/submit-form - Submitting form:",
      slug,
      submitUserFormDto,
    );
    const result = await this.landingPageService.submitUserForm(
      slug,
      submitUserFormDto,
    );
    console.log("✅ Form submitted successfully:", result);
    return result;
  }

  @Post("by-course-slug/:courseSlug/submit-form")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Submit user form by course slug (Public)",
  })
  @ApiParam({
    name: "courseSlug",
    type: String,
    description: "Course slug",
  })
  @ApiResponse({ status: 200, description: "Form submitted successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({
    status: 404,
    description: "Course or landing page not found",
  })
  async submitUserFormByCourseSlug(
    @Param("courseSlug") courseSlug: string,
    @Body() submitUserFormDto: SubmitUserFormDto,
  ) {
    console.log(
      "📝 POST /landing-pages/by-course-slug/:courseSlug/submit-form - Submitting form:",
      courseSlug,
      submitUserFormDto,
    );
    const result = await this.landingPageService.submitUserFormByCourseSlug(
      courseSlug,
      submitUserFormDto,
    );
    console.log("✅ Form submitted successfully:", result);
    return result;
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({
    summary: "Get all landing pages with pagination and filtering",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({
    name: "sort",
    required: false,
    type: String,
    example: "created_at",
  })
  @ApiQuery({
    name: "order",
    required: false,
    enum: ["asc", "desc"],
    example: "desc",
  })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "course_id", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiResponse({
    status: 200,
    description: "Landing pages retrieved successfully",
  })
  async findAll(@Query() query: GetLandingPagesDto, @Request() req: any) {
    const searchDto: SearchLandingPageDto = {
      course_id: query.course_id,
      book_id: query.book_id,
      indicator_id: query.indicator_id,
      status: query.status,
    };

    const isAdmin = req.user?.role === "admin";

    return this.landingPageService.findAll(query, searchDto, isAdmin);
  }

  @Get("slug/:slug")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get a landing page by slug (Public)" })
  @ApiParam({ name: "slug", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing page retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  async findBySlug(@Param("slug") slug: string, @Request() req: any) {
    const isAdmin = req.user?.role === "admin";
    return this.landingPageService.findBySlug(slug, isAdmin);
  }

  @Get("by-course-slug/:courseSlug")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get landing page by course slug (Public)" })
  @ApiParam({ name: "courseSlug", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing page retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Course or landing page not found" })
  async findByCourseSlug(
    @Param("courseSlug") courseSlug: string,
    @Request() req: any,
  ) {
    const isAdmin = req.user?.role === "admin";
    return this.landingPageService.findByCourseSlug(courseSlug, isAdmin);
  }

  @Get("course/:courseId")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get landing pages by course ID" })
  @ApiParam({ name: "courseId", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing pages retrieved successfully",
  })
  async findByCourseId(@Param("courseId") courseId: string) {
    return this.landingPageService.findByCourseId(courseId);
  }

  @Get(":id")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Get a landing page by ID" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing page retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  async findOne(@Param("id") id: string, @Request() req: any) {
    const isAdmin = req.user?.role === "admin";
    return this.landingPageService.findOne(id, isAdmin);
  }

  @Put(":id")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a landing page (Admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing page updated successfully",
  })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async update(
    @Param("id") id: string,
    @Body() updateLandingPageDto: UpdateLandingPageDto,
  ) {
    return this.landingPageService.update(id, updateLandingPageDto);
  }

  @Delete("bulk/delete")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Permanently delete multiple landing pages (Admin only)",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({
    status: 204,
    description: "Landing pages permanently deleted",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async removeMany(@Body("ids") ids: string[]) {
    console.log("🗑️ Bulk hard deleting landing pages:", ids);
    await this.landingPageService.hardDeleteMany(ids);
  }

  @Delete("bulk/hard")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Permanently delete multiple landing pages (Admin only)",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({
    status: 204,
    description: "Landing pages permanently deleted",
  })
  async hardDeleteMany(@Body("ids") ids: string[]) {
    await this.landingPageService.hardDeleteMany(ids);
  }

  @Delete(":id")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Permanently delete a landing page (Admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Landing page permanently deleted" })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async remove(@Param("id") id: string) {
    await this.landingPageService.hardDelete(id);
  }

  @Delete(":id/hard")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Permanently delete a landing page (Admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Landing page permanently deleted" })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async hardDelete(@Param("id") id: string) {
    await this.landingPageService.hardDelete(id);
  }

  @Put(":id/restore")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Restore a soft-deleted landing page (Admin only)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({
    status: 200,
    description: "Landing page restored successfully",
  })
  @ApiResponse({ status: 404, description: "Landing page not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async restore(@Param("id") id: string) {
    return this.landingPageService.restore(id);
  }
}
