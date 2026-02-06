import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { PaymentNotificationListener } from './listeners/payment-notification.listener';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { BookStoreModule } from '../book-store/book-store.module';
import { IndicatorStoreModule } from '../indicator-store/indicator-store.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    CourseModule,
    BookStoreModule,
    IndicatorStoreModule,
  ],
  providers: [TelegramService, PaymentNotificationListener],
  exports: [TelegramService],
})
export class TelegramModule {}
