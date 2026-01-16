import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAccessGuard } from "../auth/guards/jwt-access.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";
import { EmailAutomationService } from "./services/email-automation.service";
import { EmailTemplateService } from "./services/email-template.service";
import { CreateAutomationDto, UpdateAutomationDto } from "./dto/automation.dto";
import { CreateStepDto, UpdateStepDto } from "./dto/step.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EmailLog, EmailLogDocument } from "./entities/email-log.entity";

@ApiTags("Email Automation")
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admin can access
@Controller("email-automation")
export class EmailAutomationController {
  constructor(
    private automationService: EmailAutomationService,
    private templateService: EmailTemplateService,
    @InjectModel(EmailLog.name)
    private emailLogModel: Model<EmailLogDocument>
  ) {}

  // ===== AUTOMATION ENDPOINTS =====

  @Get()
  @ApiOperation({ summary: "Get all email automations" })
  async getAutomations(@Query("includeInactive") includeInactive?: string) {
    const include = includeInactive === "true";
    return this.automationService.getAutomations(include);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get automation by ID with steps" })
  async getAutomation(@Param("id") id: string) {
    const automation = await this.automationService.getAutomationById(id);
    const steps = await this.automationService.getSteps(id);
    return { ...automation.toObject(), steps };
  }

  @Post()
  @ApiOperation({ summary: "Create new email automation" })
  async createAutomation(
    @Body() dto: CreateAutomationDto,
    @Request() req: any
  ) {
    return this.automationService.createAutomation({
      ...dto,
      created_by: req.user.userId,
    });
  }

  @Put(":id")
  @ApiOperation({ summary: "Update email automation" })
  async updateAutomation(
    @Param("id") id: string,
    @Body() dto: UpdateAutomationDto
  ) {
    return this.automationService.updateAutomation(id, dto);
  }

  @Patch(":id/toggle")
  @ApiOperation({ summary: "Toggle automation active status" })
  async toggleAutomation(@Param("id") id: string) {
    return this.automationService.toggleActive(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete email automation" })
  async deleteAutomation(@Param("id") id: string) {
    await this.automationService.deleteAutomation(id);
    return { message: "Automation deleted successfully" };
  }

  // ===== STEP ENDPOINTS =====

  @Get(":automationId/steps")
  @ApiOperation({ summary: "Get steps for automation" })
  async getSteps(@Param("automationId") automationId: string) {
    return this.automationService.getSteps(automationId);
  }

  @Post(":automationId/steps")
  @ApiOperation({ summary: "Add step to automation" })
  async addStep(
    @Param("automationId") automationId: string,
    @Body() dto: CreateStepDto
  ) {
    return this.automationService.addStep({
      ...dto,
      automation_id: automationId,
    });
  }

  @Put("steps/:stepId")
  @ApiOperation({ summary: "Update email step" })
  async updateStep(
    @Param("stepId") stepId: string,
    @Body() dto: UpdateStepDto
  ) {
    return this.automationService.updateStep(stepId, dto);
  }

  @Delete("steps/:stepId")
  @ApiOperation({ summary: "Delete email step" })
  async deleteStep(@Param("stepId") stepId: string) {
    await this.automationService.deleteStep(stepId);
    return { message: "Step deleted successfully" };
  }

  // ===== EMAIL LOG ENDPOINTS =====

  @Get("logs/history")
  @ApiOperation({ summary: "Get email send history" })
  async getEmailLogs(
    @Query("automationId") automationId?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string
  ) {
    return this.automationService.getEmailHistory({
      automationId,
      status,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
    });
  }

  // ===== TEMPLATE HELPER ENDPOINTS =====

  @Get("templates/variables/:eventType")
  @ApiOperation({ summary: "Get available template variables for event type" })
  async getTemplateVariables(@Param("eventType") eventType: string) {
    return {
      variables: this.templateService.getAvailableVariables(eventType as any),
    };
  }

  @Post("templates/preview")
  @ApiOperation({ summary: "Preview template with sample data" })
  async previewTemplate(@Body() body: { template: string; eventType: string }) {
    const preview = this.templateService.getTemplatePreview(
      body.template,
      body.eventType as any
    );
    return { preview };
  }
}
