import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto, FilterAuditLogDto } from './dto/audit-log.dto';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @ApiOperation({ summary: 'Create a manual audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  create(@Body(ValidationPipe) createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogService.create(createAuditLogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit logs with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'useCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'action', required: false, type: String, example: 'CREATE' })
  @ApiQuery({ name: 'entity', required: false, type: String, example: 'User' })
  @ApiQuery({ name: 'entity_id', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'ip_address', required: false, type: String })
  @ApiQuery({ name: 'start_date', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'end_date', required: false, type: String, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  findAll(
    @Query(ValidationPipe) filter: FilterAuditLogDto,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('useCache') useCache: string = 'false',
  ) {
    return this.auditLogService.findAll(
      filter,
      parseInt(page),
      parseInt(limit),
      useCache === 'true',
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        total: 100,
        by_action: [
          { action: 'CREATE', count: 50 },
          { action: 'UPDATE', count: 30 },
          { action: 'DELETE', count: 20 }
        ]
      }
    }
  })
  getStatistics() {
    return this.auditLogService.getStatistics();
  }

  @Get('entity/:entity/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  @ApiParam({ name: 'entity', type: String, example: 'User', description: 'Entity name' })
  @ApiParam({ name: 'entityId', type: String, example: '507f1f77bcf86cd799439011', description: 'Entity ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Entity audit logs retrieved successfully' })
  findByEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.auditLogService.findByEntity(
      entity,
      entityId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  @ApiParam({ name: 'userId', type: String, example: '507f1f77bcf86cd799439012', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'User audit logs retrieved successfully' })
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.auditLogService.findByUser(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('action/:action')
  @ApiOperation({ summary: 'Get audit logs by action type' })
  @ApiParam({ name: 'action', type: String, example: 'DELETE', description: 'Action type (CREATE, UPDATE, DELETE, READ)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Action audit logs retrieved successfully' })
  findByAction(
    @Param('action') action: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.auditLogService.findByAction(
      action,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('ip/:ipAddress')
  @ApiOperation({ summary: 'Get audit logs by IP address' })
  @ApiParam({ name: 'ipAddress', type: String, example: '192.168.1.1', description: 'IP address' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'IP address audit logs retrieved successfully' })
  findByIpAddress(
    @Param('ipAddress') ipAddress: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.auditLogService.findByIpAddress(
      ipAddress,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific audit log by ID' })
  @ApiParam({ name: 'id', type: String, example: '507f1f77bcf86cd799439013', description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
