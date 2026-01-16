import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "email_automation_steps", timestamps: false })
export class EmailAutomationStep extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "EmailAutomation", required: true })
  automation_id: Types.ObjectId;

  @Prop({ required: true })
  step_order: number;

  @Prop({ required: true, default: 0 })
  delay_minutes: number;

  @Prop({ required: true })
  subject_template: string;

  @Prop({ required: true })
  body_template: string;
}

export type EmailAutomationStepDocument = HydratedDocument<EmailAutomationStep>;
export const EmailAutomationStepSchema =
  SchemaFactory.createForClass(EmailAutomationStep);

// Add indexes
EmailAutomationStepSchema.index({ automation_id: 1, step_order: 1 });
EmailAutomationStepSchema.index({ is_deleted: 1 });
