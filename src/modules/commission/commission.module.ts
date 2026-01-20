import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Commission, CommissionSchema } from "./entities/commission.entity";
import { CommissionRepository } from "./commission.repository";
import { CommissionService } from "./commission.service";
import {
  SalerDetails,
  SalerDetailsSchema,
} from "../saler-details/entities/saler-details.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commission.name, schema: CommissionSchema },
      { name: SalerDetails.name, schema: SalerDetailsSchema },
    ]),
  ],
  providers: [CommissionRepository, CommissionService],
  exports: [CommissionService, CommissionRepository],
})
export class CommissionModule {}
