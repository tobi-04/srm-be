import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum EventType {
  USER_REGISTERED = "user.registered",
  COURSE_PURCHASED = "course.purchased",
  USER_REGISTERED_BUT_NOT_PURCHASED = "user.registered.no.purchase",
}

export enum TriggerType {
  EVENT = "event",
  GROUP = "group",
}

export enum TargetGroup {
  ALL_STUDENTS = "all_students",
  UNPURCHASED_STUDENTS = "unpurchased_students",
  PURCHASED_STUDENTS = "purchased_students",
  SALERS = "salers",
}

@Schema({ collection: "email_automations", timestamps: false })
export class EmailAutomation extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({
    type: String,
    enum: TriggerType,
    default: TriggerType.EVENT,
    required: true,
  })
  trigger_type: TriggerType;

  // For TriggerType.EVENT
  @Prop({ type: String, enum: EventType, required: false })
  event_type: EventType;

  // For TriggerType.GROUP
  @Prop({ type: String, enum: TargetGroup, required: false })
  target_group: TargetGroup;

  @Prop({ default: false })
  is_active: boolean;

  @Prop({ type: Types.ObjectId, ref: "User" })
  created_by: Types.ObjectId;
}

export type EmailAutomationDocument = HydratedDocument<EmailAutomation>;
export const EmailAutomationSchema =
  SchemaFactory.createForClass(EmailAutomation);

// Add indexes
EmailAutomationSchema.index({ event_type: 1, is_active: 1 });
EmailAutomationSchema.index({ is_deleted: 1 });
