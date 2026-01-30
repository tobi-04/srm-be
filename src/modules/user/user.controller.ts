import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "./entities/user.entity";
import { UserService } from "./user.service";
import { CreateUserDto, UpdateUserDto, SearchUserDto } from "./dto/user.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";

@ApiTags("users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ===== STUDENT ENDPOINTS =====

  @Get("students")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all students with enrollment status" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Students retrieved successfully" })
  async findStudents(@Query() paginationDto: PaginationDto) {
    return this.userService.findStudents(paginationDto);
  }

  @Get("students/:id/details")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get student details with courses, progress, and orders" })
  @ApiParam({ name: "id", type: String, example: "507f1f77bcf86cd799439011" })
  @ApiResponse({ status: 200, description: "Student details retrieved successfully" })
  @ApiResponse({ status: 404, description: "Student not found" })
  async getStudentDetails(@Param("id") id: string) {
    return this.userService.getStudentDetails(id);
  }

  // ===== SALER ENDPOINTS =====

  @Get("salers")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all salers" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiResponse({ status: 200, description: "Salers retrieved successfully" })
  async findSalers(@Query() paginationDto: PaginationDto) {
    return this.userService.findSalers(paginationDto);
  }

  @Post("salers")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new saler account" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", example: "saler@example.com" },
        name: { type: "string", example: "Nguyễn Văn A" },
        password: { type: "string", example: "password123" },
      },
      required: ["email", "name", "password"],
    },
  })
  @ApiResponse({ status: 201, description: "Saler created successfully" })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async createSaler(
    @Body() dto: { email: string; name: string; password: string }
  ) {
    return this.userService.createSaler(dto);
  }

  // ===== GENERAL USER ENDPOINTS =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 409, description: "Conflict - email already exists" })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post("bulk")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create multiple users" })
  @ApiBody({ type: [CreateUserDto] })
  @ApiResponse({ status: 201, description: "Users created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  async createMany(@Body() createUserDtos: CreateUserDto[]) {
    return this.userService.createMany(createUserDtos);
  }

  @Get()
  @ApiOperation({ summary: "Get all users with pagination and filtering" })
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
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "useCache", required: false, type: Boolean, example: true })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  async findAll(@Query() paginationDto: PaginationDto) {
    const searchDto: SearchUserDto = {
      role: (paginationDto as any).role,
      is_active: (paginationDto as any).is_active,
    };
    return this.userService.findAll(paginationDto, searchDto);
  }

  @Get("search")
  @ApiOperation({ summary: "Search users by name or email" })
  @ApiQuery({ name: "q", required: true, type: String, example: "john" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: "Search results retrieved successfully",
  })
  async search(
    @Query("q") query: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.userService.search(query, paginationDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id", type: String, example: "507f1f77bcf86cd799439011" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a user" })
  @ApiParam({ name: "id", type: String, example: "507f1f77bcf86cd799439011" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  async update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete a user" })
  @ApiParam({ name: "id", type: String, example: "507f1f77bcf86cd799439011" })
  @ApiResponse({
    status: 204,
    description: "User deleted successfully (soft delete)",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id") id: string) {
    await this.userService.remove(id);
  }

  @Delete("bulk/delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete multiple users" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({
    status: 204,
    description: "Users deleted successfully (soft delete)",
  })
  async removeMany(@Body("ids") ids: string[]) {
    await this.userService.removeMany(ids);
  }

  @Put(":id/restore")
  @ApiOperation({ summary: "Restore a soft-deleted user" })
  @ApiParam({ name: "id", type: String, example: "507f1f77bcf86cd799439011" })
  @ApiResponse({ status: 200, description: "User restored successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async restore(@Param("id") id: string) {
    return this.userService.restore(id);
  }

  // ===== LOCK/UNLOCK ENDPOINTS =====

  @Patch(":id/toggle-active")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Toggle user active status (lock/unlock)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User status toggled" })
  async toggleActive(@Param("id") id: string) {
    return this.userService.toggleActive(id);
  }

  @Patch("bulk/lock")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lock multiple users" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({ status: 200, description: "Users locked successfully" })
  async lockMany(@Body("ids") ids: string[]) {
    return this.userService.toggleActiveMany(ids, false);
  }

  @Patch("bulk/unlock")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unlock multiple users" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({ status: 200, description: "Users unlocked successfully" })
  async unlockMany(@Body("ids") ids: string[]) {
    return this.userService.toggleActiveMany(ids, true);
  }

  // ===== HARD DELETE ENDPOINTS =====

  @Delete(":id/hard")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete a user (hard delete)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "User permanently deleted" })
  @ApiResponse({ status: 404, description: "User not found" })
  async hardDelete(@Param("id") id: string) {
    return this.userService.hardDelete(id);
  }

  @Delete("bulk/hard")
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete multiple users (hard delete)" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
    },
  })
  @ApiResponse({ status: 200, description: "Users permanently deleted" })
  async hardDeleteMany(@Body("ids") ids: string[]) {
    return this.userService.hardDeleteMany(ids);
  }
}
