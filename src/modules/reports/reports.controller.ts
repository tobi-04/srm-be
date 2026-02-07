import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import dayjs from 'dayjs';
import { ReportsService } from './reports.service';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get report data (for table preview)
   */
  @Get()
  @ApiOperation({ summary: 'Lấy dữ liệu báo cáo (table preview)' })
  async getReports(@Query() query: GetReportsQueryDto) {
    try {
      const rows = await this.reportsService.getAllPaidOrders(query);

      return {
        success: true,
        data: rows,
        total: rows.length,
        query: {
          range: query.range,
          from: query.from,
          to: query.to,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch reports', error.stack);
      throw error;
    }
  }

  /**
   * Export report as Excel file
   */
  @Get('export')
  @ApiOperation({ summary: 'Xuất báo cáo Excel' })
  async exportReports(
    @Query() query: GetReportsQueryDto,
    @Res() res: Response,
  ) {
    try {
      this.logger.log('Exporting reports...');

      // Lấy data
      const rows = await this.reportsService.getAllPaidOrders(query);

      if (rows.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Không có dữ liệu để xuất báo cáo',
        });
      }

      // Generate Excel
      const buffer = await this.reportsService.generateExcelReport(rows);

      // Tạo filename
      const timestamp = dayjs().format('YYYYMMDD-HHmmss');
      const filename = `report-${timestamp}.xlsx`;

      // Set headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      this.logger.log(`Exported ${rows.length} rows to ${filename}`);

      // Send file
      res.send(buffer);
    } catch (error) {
      this.logger.error('Failed to export reports', error.stack);

      // Nếu đã send headers rồi, không thể throw exception
      // Chỉ log error
      if (!res.headersSent) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Lỗi khi xuất báo cáo',
          error: error.message,
        });
      }
    }
  }
}
