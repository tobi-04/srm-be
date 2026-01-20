import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "user_form_submissions", timestamps: false })
export class UserFormSubmission extends BaseEntity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "LandingPage",
    required: true,
  })
  landing_page_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ type: Date, required: false })
  birthday?: Date;

  // Additional metadata if needed
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  // UTM Tracking - traffic source reference
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "TrafficSource",
    required: false,
  })
  traffic_source_id?: string;

  // Session ID when form was submitted
  @Prop({ required: false })
  session_id?: string;

  // Saler attribution
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: false,
  })
  saler_id?: string;

  @Prop({ required: false })
  referral_code?: string;
}

export type UserFormSubmissionDocument = HydratedDocument<UserFormSubmission>;
export const UserFormSubmissionSchema =
  SchemaFactory.createForClass(UserFormSubmission);

// Add indexes for efficient querying
UserFormSubmissionSchema.index({ landing_page_id: 1 });
UserFormSubmissionSchema.index({ email: 1 });
UserFormSubmissionSchema.index({ created_at: -1 });
UserFormSubmissionSchema.index({ is_deleted: 1 });
