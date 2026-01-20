import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  SalerDetails,
  SalerDetailsSchema,
} from "./entities/saler-details.entity";
import { SalerDetailsRepository } from "./saler-details.repository";
import { SalerDetailsService } from "./saler-details.service";
import { SalerDetailsController } from "./saler-details.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalerDetails.name, schema: SalerDetailsSchema },
    ]),
  ],
  controllers: [SalerDetailsController],
  providers: [SalerDetailsRepository, SalerDetailsService],
  exports: [SalerDetailsService],
})
export class SalerDetailsModule {}
