import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "traffic_sources", timestamps: false })
export class TrafficSource extends BaseEntity {
  @Prop({ required: false })
  utm_source: string; // facebook, google, tiktok, youtube, ads, direct

  @Prop({ required: false })
  utm_medium: string; // cpc, organic, email, social

  @Prop({ required: false })
  utm_campaign: string; // campaign name (react_sale, nodejs_promo)

  @Prop({ required: false })
  utm_content: string; // video_1, banner_2, carousel_ads

  @Prop({ required: false })
  utm_term: string; // keyword retargeting

  @Prop({ required: true })
  landing_page: string; // /khoa-react, /khoa-nodejs

  @Prop({ required: false })
  referrer: string; // document.referrer (backup)

  @Prop({ type: Date, default: Date.now })
  first_visit_at: Date; // timestamp of first visit

  @Prop({ required: true })
  session_id: string; // UUID of first session

  @Prop({ required: false })
  ip_address: string; // user IP

  @Prop({ required: false })
  user_agent: string; // browser info
}

export type TrafficSourceDocument = HydratedDocument<TrafficSource>;
export const TrafficSourceSchema = SchemaFactory.createForClass(TrafficSource);

// Add indexes for efficient querying
TrafficSourceSchema.index({ session_id: 1, landing_page: 1 }, { unique: true });
TrafficSourceSchema.index({ utm_source: 1, utm_campaign: 1 });
TrafficSourceSchema.index({ created_at: -1 });
TrafficSourceSchema.index({ is_deleted: 1 });
