import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum IndicatorStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
}

/**
 * Indicator Entity - Dịch vụ/sản phẩm cho thuê
 * Người dùng sẽ thuê Indicator theo hình thức subscription hàng tháng
 */
@Schema({ collection: "indicators", timestamps: false })
export class Indicator extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ default: "" })
  cover_image: string;

  /**
   * Giá thuê hàng tháng (VND)
   */
  @Prop({ required: true, min: 0, default: 0 })
  price_monthly: number;

  @Prop({ default: 0, min: 0, max: 100 })
  default_discount_percent: number;

  @Prop({
    type: String,
    enum: IndicatorStatus,
    default: IndicatorStatus.INACTIVE,
  })
  status: IndicatorStatus;

  /**
   * Thông tin liên hệ Indicator - CHỈ hiển thị cho user đã thuê
   */
  @Prop({ default: "" })
  owner_name: string;

  @Prop({ default: "" })
  contact_email: string;

  @Prop({ default: "" })
  contact_telegram: string;

  @Prop({ default: "" })
  description_detail: string;
}

export type IndicatorDocument = HydratedDocument<Indicator>;
export const IndicatorSchema = SchemaFactory.createForClass(Indicator);

// Add indexes
IndicatorSchema.index({ name: "text", description: "text" });
IndicatorSchema.index({ status: 1, is_deleted: 1 });
IndicatorSchema.index({ slug: 1 });
IndicatorSchema.index({ price_monthly: 1 });
