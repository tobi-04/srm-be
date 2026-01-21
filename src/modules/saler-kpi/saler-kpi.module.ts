import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SalerKPIService } from "./saler-kpi.service";
import { SalerKPIController } from "./saler-kpi.controller";
import { SalerKPI, SalerKPISchema } from "./entities/saler-kpi.entity";
import {
  SalerDetails,
  SalerDetailsSchema,
} from "../saler-details/entities/saler-details.entity";
import { OrderModule } from "../order/order.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalerKPI.name, schema: SalerKPISchema },
      { name: SalerDetails.name, schema: SalerDetailsSchema },
    ]),
    OrderModule,
  ],
  controllers: [SalerKPIController],
  providers: [SalerKPIService],
  exports: [SalerKPIService],
})
export class SalerKPIModule {}
