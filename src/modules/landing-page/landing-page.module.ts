import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LandingPageController } from "./landing-page.controller";
import { LandingPageService } from "./landing-page.service";
import { LandingPageRepository } from "./landing-page.repository";
import { LandingPage, LandingPageSchema } from "./entities/landing-page.entity";
import {
  UserFormSubmission,
  UserFormSubmissionSchema,
} from "./entities/user-form-submission.entity";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";
import { CourseEnrollmentModule } from "../course-enrollment/course-enrollment.module";
import { UserModule } from "../user/user.module";
import { TrafficSourceModule } from "../traffic-source/traffic-source.module";
import { SalerDetailsModule } from "../saler-details/saler-details.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LandingPage.name, schema: LandingPageSchema },
      { name: UserFormSubmission.name, schema: UserFormSubmissionSchema },
    ]),
    RedisCacheModule,
    CourseEnrollmentModule,
    UserModule,
    TrafficSourceModule,
    SalerDetailsModule,
  ],
  controllers: [LandingPageController],
  providers: [LandingPageService, LandingPageRepository],
  exports: [LandingPageService, LandingPageRepository],
})
export class LandingPageModule {}
