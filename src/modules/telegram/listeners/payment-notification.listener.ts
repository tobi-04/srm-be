import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelegramService } from '../telegram.service';
import { UserService } from '../../user/user.service';
import { CourseService } from '../../course/course.service';
import { BookStoreService } from '../../book-store/book-store.service';
import { IndicatorStoreService } from '../../indicator-store/indicator-store.service';
import {
  PaymentPaidEvent,
  ProductType,
} from '../dto/payment-paid-event.dto';

/**
 * Listener lắng nghe event payment.paid và gửi thông báo Telegram
 * Không chứa logic nghiệp vụ, chỉ gửi notification
 */
@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
    private readonly courseService: CourseService,
    private readonly bookStoreService: BookStoreService,
    private readonly indicatorStoreService: IndicatorStoreService,
  ) {}

  /**
   * Lắng nghe event: payment.paid
   * Event này được emit khi có bất kỳ thanh toán nào thành công
   */
  @OnEvent('payment.paid', { async: true })
  async handlePaymentPaid(payload: PaymentPaidEvent) {
    try {
      this.logger.log(
        `📢 Received payment.paid event for ${payload.product_type}`,
      );

      // Load thêm dữ liệu cần thiết
      const user = await this.userService.findOne(payload.user_id);
      if (!user) {
        this.logger.error(`❌ User not found: ${payload.user_id}`);
        return;
      }

      // Render message theo product_type
      let message: string;

      switch (payload.product_type) {
        case ProductType.COURSE:
          message = await this.renderCourseMessage(payload, user);
          break;

        case ProductType.BOOK:
          message = await this.renderBookMessage(payload, user);
          break;

        case ProductType.INDICATOR:
          message = await this.renderIndicatorMessage(payload, user);
          break;

        default:
          this.logger.warn(
            `⚠️ Unknown product type: ${payload.product_type}`,
          );
          return;
      }

      // Gửi message Telegram (không block payment flow)
      await this.telegramService.sendMessage(message);

      this.logger.log('✅ Payment notification sent to Telegram');
    } catch (error: any) {
      // Chỉ log lỗi, không throw để không ảnh hưởng payment flow
      this.logger.error(
        `❌ Failed to send Telegram notification: ${error.message}`,
      );
    }
  }

  /**
   * Render message cho COURSE
   */
  private async renderCourseMessage(
    payload: PaymentPaidEvent,
    user: any,
  ): Promise<string> {
    const course = await this.courseService.findOne(payload.product_id);

    return `
💰 <b>THANH TOÁN THÀNH CÔNG</b>

👤 User: ${user.email}
📦 Sản phẩm: KHÓA HỌC
📘 Tên: ${course?.title || 'N/A'}
💵 Số tiền: ${this.telegramService.formatAmount(payload.amount)}
🕒 Thời gian: ${this.telegramService.formatDateTime(payload.paid_at)}
    `.trim();
  }

  /**
   * Render message cho BOOK
   */
  private async renderBookMessage(
    payload: PaymentPaidEvent,
    user: any,
  ): Promise<string> {
    // Lấy thông tin sách từ metadata hoặc service
    const bookTitle = payload.metadata?.book_title || 'Sách điện tử';

    return `
💰 <b>THANH TOÁN THÀNH CÔNG</b>

👤 User: ${user.email}
📦 Sản phẩm: SÁCH
📘 Tên: ${bookTitle}
💵 Số tiền: ${this.telegramService.formatAmount(payload.amount)}
🕒 Thời gian: ${this.telegramService.formatDateTime(payload.paid_at)}
    `.trim();
  }

  /**
   * Render message cho INDICATOR
   */
  private async renderIndicatorMessage(
    payload: PaymentPaidEvent,
    user: any,
  ): Promise<string> {
    const indicator = await this.indicatorStoreService.findOne(
      payload.product_id,
    );

    // Format thời hạn subscription từ metadata
    const startAt = payload.metadata?.start_at
      ? this.telegramService.formatDateTime(new Date(payload.metadata.start_at))
      : 'N/A';
    const endAt = payload.metadata?.end_at
      ? this.telegramService.formatDateTime(new Date(payload.metadata.end_at))
      : 'N/A';

    return `
💰 <b>THANH TOÁN THÀNH CÔNG</b>

👤 User: ${user.email}
📦 Sản phẩm: INDICATOR
📘 Tên: ${indicator?.name || 'N/A'}
💵 Số tiền: ${this.telegramService.formatAmount(payload.amount)}
🕒 Thời gian: ${this.telegramService.formatDateTime(payload.paid_at)}
📅 Thời hạn: ${startAt} → ${endAt}
    `.trim();
  }
}
