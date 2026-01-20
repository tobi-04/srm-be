import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SalerController } from "./saler.controller";
import { SalerService } from "./saler.service";
import { OrderModule } from "../order/order.module";
import { CommissionModule } from "../commission/commission.module";
import {
  SalerDetails,
  SalerDetailsSchema,
} from "../saler-details/entities/saler-details.entity";
import { Course, CourseSchema } from "../course/entities/course.entity";
import { SalerKPIModule } from "../saler-kpi/saler-kpi.module";
import { SalerKPIService } from "../saler-kpi/saler-kpi.service";
import { OrderStatus } from "../order/entities/order.entity";
import { SalerStudentsQuery } from "./dto/saler-students-query.dto";
import { SalerCacheListener } from "./listeners/saler-cache.listener";
import { RedisCacheModule } from "../../common/cache/redis-cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalerDetails.name, schema: SalerDetailsSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    OrderModule,
    CommissionModule,
    SalerKPIModule,
    RedisCacheModule,
  ],
  controllers: [SalerController],
  providers: [SalerService, SalerCacheListener],
  exports: [SalerService],
})
export class SalerModule {}
