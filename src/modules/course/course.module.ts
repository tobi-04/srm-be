import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Course, CourseSchema } from "./entities/course.entity";
import { CourseController } from "./course.controller";
import { StudentCourseController } from "./student-course.controller";
import { CourseService } from "./course.service";
import { CourseRepository } from "./course.repository";
import { LessonModule } from "../lesson/lesson.module";
import { CourseEnrollmentModule } from "../course-enrollment/course-enrollment.module";
import { LandingPageModule } from "../landing-page/landing-page.module";
import { UserModule } from "../user/user.module";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    RedisCacheModule,
    forwardRef(() => LessonModule),
    CourseEnrollmentModule,
    forwardRef(() => LandingPageModule),
    UserModule,
  ],
  controllers: [CourseController, StudentCourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
