import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum LandingPageStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

@Schema({ collection: "landing_pages", timestamps: false })
export class LandingPage extends BaseEntity {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Course", required: true })
  course_id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({
    type: String,
    enum: LandingPageStatus,
    default: LandingPageStatus.DRAFT,
  })
  status: LandingPageStatus;

  // Craft.js serialized page structure for Step 1 (User Information Form)
  @Prop({ type: Object, default: {} })
  page_1_content: Record<string, any>;

  // Craft.js serialized page structure for Step 2 (Sales/Course Information)
  @Prop({ type: Object, default: {} })
  page_2_content: Record<string, any>;

  // Craft.js serialized page structure for Step 3 (Payment Page)
  @Prop({ type: Object, default: {} })
  page_3_content: Record<string, any>;

  // Legacy field - kept for backward compatibility
  @Prop({ type: Object, default: {} })
  page_content: Record<string, any>;

  // Form fields configuration for page 1 (user registration)
  @Prop({ type: Array, default: [] })
  form_fields: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "tel" | "textarea" | "select";
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select fields
  }>;

  // SePay configuration
  @Prop({ type: Object, default: {} })
  payment_config: {
    sepay_account_number?: string;
    sepay_account_name?: string;
    sepay_bank_name?: string;
    sepay_bank_code?: string;
  };

  // Email template for after payment
  @Prop({ type: String, default: "" })
  email_template: string;

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata?: {
    primary_color?: string;
    button_text?: string;
    success_message?: string;
  };

  @Prop({ type: Number, default: 0 })
  course_price: number;

  @Prop({ type: Boolean, default: true })
  payment_enabled: boolean;
}

export type LandingPageDocument = HydratedDocument<LandingPage>;
export const LandingPageSchema = SchemaFactory.createForClass(LandingPage);

// Indexes for efficient querying
LandingPageSchema.index({ course_id: 1 });
LandingPageSchema.index({ slug: 1 });
LandingPageSchema.index({ status: 1 });
LandingPageSchema.index({ created_at: -1 });
LandingPageSchema.index({ is_deleted: 1 });
