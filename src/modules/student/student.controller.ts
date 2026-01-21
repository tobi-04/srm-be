import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { StudentService } from "./student.service";
import {
  StudentCoursesQuery,
  StudentOrdersQuery,
} from "./dto/student-query.dto";
import {
  StudentDashboardResponse,
  StudentCoursesResponse,
  StudentCourseDetailResponse,
} from "./dto/student-response.dto";
import { UpdateProfileDto } from "./dto/student-profile.dto";

@ApiTags("Student")
@ApiBearerAuth()
@Controller("student")
@UseGuards(JwtAccessGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get("dashboard/overview")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get student dashboard overview" })
  @ApiResponse({
    status: 200,
    description: "Dashboard data",
    type: StudentDashboardResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Req() req: any): Promise<StudentDashboardResponse> {
    const studentId = req.user.userId;
    return this.studentService.getDashboardOverview(studentId);
  }

  @Get("courses")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get enrolled courses with pagination" })
  @ApiResponse({
    status: 200,
    description: "Paginated courses",
    type: StudentCoursesResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getCourses(
    @Req() req: any,
    @Query() query: StudentCoursesQuery,
  ): Promise<StudentCoursesResponse> {
    const studentId = req.user.userId;
    return this.studentService.getCourses(studentId, query);
  }

  @Get("course/:slug")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get course details with lessons" })
  @ApiResponse({
    status: 200,
    description: "Course details",
    type: StudentCourseDetailResponse,
  })
  @HttpCode(HttpStatus.OK)
  async getCourseDetail(
    @Req() req: any,
    @Query("slug") slug: string,
  ): Promise<StudentCourseDetailResponse> {
    const studentId = req.user.userId;
    return this.studentService.getCourseDetail(studentId, slug);
  }

  @Get("profile")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get student profile" })
  @ApiResponse({ status: 200, description: "Profile data" })
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    const studentId = req.user.userId;
    return this.studentService.getProfile(studentId);
  }

  @Put("profile")
  @ApiOperation({ summary: "Update student profile" })
  @ApiResponse({ status: 200, description: "Profile updated" })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const studentId = req.user.userId;
    return this.studentService.updateProfile(studentId, updateProfileDto);
  }

  @Get("orders")
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // 5 minutes
  @ApiOperation({ summary: "Get order history with pagination" })
  @ApiResponse({ status: 200, description: "Paginated orders" })
  @HttpCode(HttpStatus.OK)
  async getOrders(@Req() req: any, @Query() query: StudentOrdersQuery) {
    const studentId = req.user.userId;
    return this.studentService.getOrders(studentId, query);
  }
}
