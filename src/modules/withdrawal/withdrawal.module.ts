import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from "./entities/withdrawal-request.entity";
import {
  WithdrawalConfig,
  WithdrawalConfigSchema,
} from "./entities/withdrawal-config.entity";
import { WithdrawalService } from "./withdrawal.service";
import { WithdrawalSalerController } from "./withdrawal-saler.controller";
import { WithdrawalAdminController } from "./withdrawal-admin.controller";
import { CommissionModule } from "../commission/commission.module";
import {
  SalerDetails,
  SalerDetailsSchema,
} from "../saler-details/entities/saler-details.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: WithdrawalConfig.name, schema: WithdrawalConfigSchema },
      { name: SalerDetails.name, schema: SalerDetailsSchema },
    ]),
    CommissionModule,
  ],
  controllers: [WithdrawalSalerController, WithdrawalAdminController],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
