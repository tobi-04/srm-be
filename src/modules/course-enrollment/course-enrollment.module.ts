import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CourseEnrollmentService } from "./course-enrollment.service";
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from "./entities/course-enrollment.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
    ]),
  ],
  providers: [CourseEnrollmentService],
  exports: [CourseEnrollmentService],
})
export class CourseEnrollmentModule {}
