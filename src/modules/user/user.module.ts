import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./entities/user.entity";
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from "../course-enrollment/entities/course-enrollment.entity";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserRepository } from "./user.repository";
import { SalerDetailsModule } from "../saler-details/saler-details.module";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
    ]),
    SalerDetailsModule,
    RedisCacheModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository, MongooseModule],
})
export class UserModule {}
