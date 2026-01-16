import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum EmailLogStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
}

@Schema({ collection: "email_logs", timestamps: false })
export class EmailLog extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmailAutomation", required: true })
  automation_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "EmailAutomationStep", required: true })
  step_id: Types.ObjectId;

  @Prop({ required: true })
  recipient_email: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ type: String, enum: EmailLogStatus, default: EmailLogStatus.PENDING })
  status: EmailLogStatus;

  @Prop()
  sent_at: Date;

  @Prop()
  error_message: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  // Optional key to differentiate broadcasts (e.g. date string for recurring)
  @Prop({ default: "once" })
  broadcast_key: string;
}

export type EmailLogDocument = HydratedDocument<EmailLog>;
export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);

// Add indexes
EmailLogSchema.index(
  { user_id: 1, automation_id: 1, step_id: 1, broadcast_key: 1 },
  { unique: true }
);
EmailLogSchema.index({ status: 1, created_at: -1 });
EmailLogSchema.index({ automation_id: 1, created_at: -1 });
EmailLogSchema.index({ is_deleted: 1 });
