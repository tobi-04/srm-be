import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { R2Module } from './common/storage/r2.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { CourseModule } from './modules/course/course.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { LandingPageModule } from './modules/landing-page/landing-page.module';
import { ApiLoggerMiddleware } from './common/middleware/api-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/srm-lesson'),
    RedisCacheModule,
    R2Module,
    UserModule,
    AuthModule,
    AuditLogModule,
    CourseModule,
    LessonModule,
    LandingPageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiLoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
