import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "withdrawal_config", timestamps: false })
export class WithdrawalConfig extends BaseEntity {
  // Minimum amount required to withdraw (in VND)
  @Prop({ type: Number, required: true, min: 0, default: 100000 })
  min_withdrawal_amount: number;

  // Fee rate percentage (0-100)
  @Prop({ type: Number, required: true, min: 0, max: 100, default: 5 })
  fee_rate: number;

  // Whether withdrawals are enabled
  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  // Last admin who updated the config
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    default: null,
  })
  updated_by: string | null;
}

export type WithdrawalConfigDocument = HydratedDocument<WithdrawalConfig>;
export const WithdrawalConfigSchema =
  SchemaFactory.createForClass(WithdrawalConfig);
