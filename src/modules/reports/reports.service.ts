import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { Order, OrderStatus } from '../order/entities/order.entity';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../payment-transaction/entities/payment-transaction.entity';
import {
  BookOrder,
  BookOrderStatus,
} from '../book-store/entities/book-order.entity';
import { BookOrderItem } from '../book-store/entities/book-order-item.entity';
import {
  IndicatorPayment,
  PaymentStatus,
} from '../indicator-store/entities/indicator-payment.entity';
import { IndicatorSubscription } from '../indicator-store/entities/indicator-subscription.entity';
import { User } from '../user/entities/user.entity';
import { Course } from '../course/entities/course.entity';
import { Book } from '../book-store/entities/book.entity';
import { Indicator } from '../indicator-store/entities/indicator.entity';
import { GetReportsQueryDto, TimeRange } from './dto/get-reports-query.dto';

export interface ReportRow {
  invoiceNumber: number;
  invoiceDate: Date;
  customerName: string;
  address: string;
  taxCode: string;
  email: string;
  paymentMethod: string;
  vatRate: string;
  vatAmount: string;
  productName: string;
  unit: string;
  quantity: number;
  amount: number;
  productType: 'COURSE' | 'BOOK' | 'INDICATOR';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(PaymentTransaction.name)
    private paymentTransactionModel: Model<PaymentTransaction>,
    @InjectModel(BookOrder.name) private bookOrderModel: Model<BookOrder>,
    @InjectModel(BookOrderItem.name)
    private bookOrderItemModel: Model<BookOrderItem>,
    @InjectModel(IndicatorPayment.name)
    private indicatorPaymentModel: Model<IndicatorPayment>,
    @InjectModel(IndicatorSubscription.name)
    private indicatorSubscriptionModel: Model<IndicatorSubscription>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Book.name) private bookModel: Model<Book>,
    @InjectModel(Indicator.name) private indicatorModel: Model<Indicator>,
  ) {}

  /**
   * Tính toán date range từ query params
   */
  private calculateDateRange(query: GetReportsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs;

    switch (query.range) {
      case TimeRange.WEEK:
        // 7 ngày gần nhất: từ 7 ngày trước 00:00:00 đến hôm nay 23:59:59
        startDate = now.subtract(7, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case TimeRange.MONTH:
        // 30 ngày gần nhất: từ 30 ngày trước 00:00:00 đến hôm nay 23:59:59
        startDate = now.subtract(30, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case TimeRange.QUARTER:
        // 90 ngày gần nhất (3 tháng): từ 90 ngày trước 00:00:00 đến hôm nay 23:59:59
        startDate = now.subtract(90, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case TimeRange.YEAR:
        // 365 ngày gần nhất: từ 365 ngày trước 00:00:00 đến hôm nay 23:59:59
        startDate = now.subtract(365, 'day').startOf('day');
        endDate = now.endOf('day');
        break;
      case TimeRange.CUSTOM:
        // Custom range: từ ngày from 00:00:00 đến ngày to 23:59:59
        if (query.from) {
          startDate = dayjs(query.from).startOf('day');
        } else {
          startDate = dayjs('2020-01-01').startOf('day');
        }
        if (query.to) {
          endDate = dayjs(query.to).endOf('day');
        } else {
          endDate = now.endOf('day');
        }
        break;
      case TimeRange.ALL:
      default:
        // Tất cả: từ 2020-01-01 00:00:00 đến hôm nay 23:59:59
        startDate = dayjs('2020-01-01').startOf('day');
        endDate = now.endOf('day');
        break;
    }

    return {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
    };
  }

  /**
   * Lấy tất cả orders đã thanh toán
   * Logic giống hệt analytics.service.ts getTransactionsPaginated()
   */
  async getAllPaidOrders(query: GetReportsQueryDto): Promise<ReportRow[]> {
    const { startDate, endDate } = this.calculateDateRange(query);

    this.logger.log(
      `Fetching reports from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const dateFilter = {
      $gte: startDate,
      $lte: endDate,
    };

    // Build Course Pipeline (from payment_transactions)
    const buildCoursePipeline = () => {
      const pipeline: any[] = [
        {
          $match: {
            status: PaymentTransactionStatus.COMPLETED,
            is_deleted: false,
            $or: [
              { paid_at: dateFilter },
              {
                $and: [
                  { paid_at: { $exists: false } },
                  { updated_at: dateFilter },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'user_form_submissions',
            localField: 'user_form_submission_id',
            foreignField: '_id',
            as: 'submission',
          },
        },
        { $unwind: { path: '$submission', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'courses',
            localField: 'course_id',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: 'COURSE' },
            amount: 1,
            paid_at: 1,
            updated_at: 1,
            customer_name: '$submission.name',
            customer_email: '$submission.email',
            product_name: '$course.title',
          },
        },
      ];
      return pipeline;
    };

    // Build Book Pipeline (from book_orders)
    const buildBookPipeline = () => {
      const pipeline: any[] = [
        {
          $match: {
            status: BookOrderStatus.PAID,
            is_deleted: false,
            $or: [
              { paid_at: dateFilter },
              {
                $and: [
                  { paid_at: { $exists: false } },
                  { updated_at: dateFilter },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'book_order_items',
            localField: '_id',
            foreignField: 'order_id',
            as: 'items',
          },
        },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: 'BOOK' },
            amount: '$items.price',
            paid_at: 1,
            updated_at: 1,
            customer_name: '$user.name',
            customer_email: '$user.email',
            product_name: '$items.book_title',
          },
        },
      ];
      return pipeline;
    };

    // Build Indicator Pipeline (from indicator_subscriptions)
    const buildIndicatorPipeline = () => {
      const pipeline: any[] = [
        {
          $match: {
            status: 'ACTIVE', // SubscriptionStatus.ACTIVE
            is_deleted: false,
            $or: [
              { start_at: dateFilter },
              {
                $and: [
                  { start_at: { $exists: false } },
                  { updated_at: dateFilter },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'indicators',
            localField: 'indicator_id',
            foreignField: '_id',
            as: 'indicator',
          },
        },
        { $unwind: { path: '$indicator', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            type: { $literal: 'INDICATOR' },
            amount: '$indicator.price_monthly',
            paid_at: '$start_at',
            updated_at: 1,
            customer_name: '$user.name',
            customer_email: '$user.email',
            product_name: '$indicator.name',
          },
        },
      ];
      return pipeline;
    };

    // Run all queries in parallel (same as analytics service)
    const queries: Promise<any[]>[] = [
      this.paymentTransactionModel.aggregate(buildCoursePipeline()).exec(),
      this.bookOrderModel.aggregate(buildBookPipeline()).exec(),
      this.indicatorSubscriptionModel.aggregate(buildIndicatorPipeline()).exec(),
    ];

    const results = await Promise.all(queries);
    const allData = results.flat();

    this.logger.log(`Found ${allData.length} total transactions`);

    // Sort by date descending
    allData.sort((a, b) => {
      const dateA = a.paid_at || a.updated_at || a._id.getTimestamp();
      const dateB = b.paid_at || b.updated_at || b._id.getTimestamp();
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Convert to ReportRow format
    const reportRows: ReportRow[] = allData.map((item, index) => {
      let productName = '';
      let unit = '';

      if (item.type === 'COURSE') {
        productName = item.product_name
          ? `Mua khóa học: ${item.product_name}`
          : 'Mua khóa học';
        unit = '1 Khóa';
      } else if (item.type === 'BOOK') {
        productName = item.product_name
          ? `Mua sách điện tử: ${item.product_name}`
          : 'Mua sách điện tử';
        unit = '1 Quyển';
      } else if (item.type === 'INDICATOR') {
        productName = item.product_name
          ? `Thuê indicator: ${item.product_name}`
          : 'Thuê indicator';
        unit = '1 Người';
      }

      return {
        invoiceNumber: index + 1,
        invoiceDate: item.paid_at || item.updated_at,
        customerName: item.customer_name || item.customer_email || 'N/A',
        address: '',
        taxCode: '',
        email: item.customer_email || 'N/A',
        paymentMethod: 'Chuyển khoản',
        vatRate: '',
        vatAmount: '',
        productName,
        unit,
        quantity: 1,
        amount: item.amount || 0,
        productType: item.type,
      };
    });

    this.logger.log(`Generated ${reportRows.length} report rows`);

    return reportRows;
  }

  /**
   * Generate Excel file từ report rows
   */
  async generateExcelReport(rows: ReportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo');

    // Define columns theo template
    worksheet.columns = [
      { header: 'Số thứ tự hóa đơn', key: 'invoiceNumber', width: 20 },
      { header: 'Ngày hóa đơn', key: 'invoiceDate', width: 20 },
      { header: 'Tên khách hàng', key: 'customerName', width: 30 },
      { header: 'Địa chỉ', key: 'address', width: 40 },
      { header: 'Mã số thuế', key: 'taxCode', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Hình thức thanh toán', key: 'paymentMethod', width: 20 },
      { header: 'Thuế suất GTGT (%)', key: 'vatRate', width: 18 },
      { header: 'Tiền thuế GTGT', key: 'vatAmount', width: 18 },
      { header: 'Tên hàng hóa/ Dịch vụ', key: 'productName', width: 50 },
      { header: 'ĐVT', key: 'unit', width: 12 },
      { header: 'Số lượng', key: 'quantity', width: 12 },
      { header: 'Số tiền', key: 'amount', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    // Add data rows
    rows.forEach((row) => {
      worksheet.addRow({
        invoiceNumber: row.invoiceNumber,
        invoiceDate: dayjs(row.invoiceDate).format('YYYY-MM-DD HH:mm:ss'),
        customerName: row.customerName,
        address: row.address,
        taxCode: row.taxCode,
        email: row.email,
        paymentMethod: row.paymentMethod,
        vatRate: row.vatRate,
        vatAmount: row.vatAmount,
        productName: row.productName,
        unit: row.unit,
        quantity: row.quantity,
        amount: row.amount,
      });
    });

    // Style all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle' };
        }
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
