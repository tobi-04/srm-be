import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export class PageVisit {
  @Prop({ required: true })
  url: string;

  @Prop({ type: Date, default: Date.now })
  visited_at: Date;

  @Prop({ type: Number, default: 0 })
  time_spent: number; // seconds
}

@Schema({ collection: "sessions", timestamps: false })
export class Session extends BaseEntity {
  @Prop({ required: true, unique: true })
  session_id: string; // UUID unique per session

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "TrafficSource",
    required: false,
  })
  traffic_source_id: string; // ref → traffic_sources

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: false })
  user_id: string; // ref → users (if registered)

  @Prop({ required: false })
  ip_address: string;

  @Prop({ required: false })
  user_agent: string;

  @Prop({ type: [Object], default: [] })
  pages_visited: PageVisit[]; // pages viewed

  @Prop({ type: Date, default: Date.now })
  session_start: Date;

  @Prop({ type: Date, required: false })
  session_end: Date;

  @Prop({ type: Number, default: 0 })
  total_duration: number; // total time in seconds

  @Prop({ type: Boolean, default: false })
  is_converted: boolean; // has purchased
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);

// Add indexes for efficient querying
SessionSchema.index({ session_id: 1 }, { unique: true });
SessionSchema.index({ traffic_source_id: 1 });
SessionSchema.index({ user_id: 1 });
SessionSchema.index({ created_at: -1 });
SessionSchema.index({ is_deleted: 1 });
