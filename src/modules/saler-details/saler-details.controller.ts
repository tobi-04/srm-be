import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";
import { SalerDetailsService } from "./saler-details.service";
import {
  UpdateKpiDto,
  AssignCoursesDto,
  UpdateCommissionsDto,
} from "./dto/saler-details.dto";

@ApiTags("saler-details")
@Controller("saler-details")
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SalerDetailsController {
  constructor(private readonly salerDetailsService: SalerDetailsService) {}

  @Get(":userId")
  @ApiOperation({ summary: "Get saler details by user ID" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({
    status: 200,
    description: "Saler details retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Saler details not found" })
  async getSalerDetails(@Param("userId") userId: string) {
    return this.salerDetailsService.getSalerDetails(userId);
  }

  @Patch(":userId/kpi")
  @ApiOperation({ summary: "Update KPI targets for a saler" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "KPI updated successfully" })
  @ApiResponse({ status: 404, description: "Saler details not found" })
  async updateKPI(
    @Param("userId") userId: string,
    @Body() updateKpiDto: UpdateKpiDto,
  ) {
    return this.salerDetailsService.updateKPI(userId, updateKpiDto);
  }

  @Post(":userId/courses")
  @ApiOperation({ summary: "Assign courses to a saler" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "Courses assigned successfully" })
  @ApiResponse({ status: 404, description: "Saler details not found" })
  async assignCourses(
    @Param("userId") userId: string,
    @Body() assignCoursesDto: AssignCoursesDto,
  ) {
    return this.salerDetailsService.assignCourses(userId, assignCoursesDto);
  }

  @Delete(":userId/courses/:courseId")
  @ApiOperation({ summary: "Unassign a course from a saler" })
  @ApiParam({ name: "userId", type: String })
  @ApiParam({ name: "courseId", type: String })
  @ApiResponse({ status: 200, description: "Course unassigned successfully" })
  @ApiResponse({ status: 404, description: "Saler details not found" })
  async unassignCourse(
    @Param("userId") userId: string,
    @Param("courseId") courseId: string,
  ) {
    return this.salerDetailsService.unassignCourse(userId, courseId);
  }

  @Patch(":userId/commissions")
  @ApiOperation({ summary: "Update commission rates for a saler" })
  @ApiParam({ name: "userId", type: String })
  @ApiResponse({ status: 200, description: "Commissions updated successfully" })
  @ApiResponse({ status: 404, description: "Saler details not found" })
  async updateCommissions(
    @Param("userId") userId: string,
    @Body() updateCommissionsDto: UpdateCommissionsDto,
  ) {
    return this.salerDetailsService.updateCommissions(
      userId,
      updateCommissionsDto,
    );
  }
}
