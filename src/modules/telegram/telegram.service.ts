import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || '';
    this.enabled =
      this.configService.get<string>('TELEGRAM_ENABLED') === 'true';

    if (this.enabled) {
      this.logger.log(
        `✅ Telegram notification enabled for chat: ${this.chatId}`,
      );
    } else {
      this.logger.warn('⚠️ Telegram notification is disabled');
    }
  }

  /**
   * Gửi message đến Telegram channel
   * @param text - Nội dung message (hỗ trợ HTML)
   * @returns Promise<boolean> - true nếu gửi thành công
   */
  async sendMessage(text: string): Promise<boolean> {
    // Nếu Telegram bị tắt, bỏ qua
    if (!this.enabled) {
      this.logger.debug('Telegram disabled, skipping message send');
      return false;
    }

    // Kiểm tra config
    if (!this.botToken || !this.chatId) {
      this.logger.error(
        '❌ Missing Telegram configuration (BOT_TOKEN or CHAT_ID)',
      );
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      if (response.data.ok) {
        this.logger.log('✅ Telegram message sent successfully');
        return true;
      } else {
        this.logger.error(
          `❌ Telegram API returned error: ${JSON.stringify(response.data)}`,
        );
        return false;
      }
    } catch (error: any) {
      // Không throw error để không block payment flow
      this.logger.error(
        `❌ Failed to send Telegram message: ${error.message}`,
      );
      if (error.response) {
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      return false;
    }
  }

  /**
   * Format số tiền theo định dạng VND
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Format thời gian theo định dạng Việt Nam
   */
  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }
}
