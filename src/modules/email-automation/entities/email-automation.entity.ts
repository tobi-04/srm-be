import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum EventType {
  USER_REGISTERED = "user.registered",
  COURSE_PURCHASED = "course.purchased",
  BOOK_PURCHASED = "book.purchased",
  INDICATOR_PURCHASED = "indicator.purchased",
  USER_REGISTERED_BUT_NOT_PURCHASED = "user.registered.no.purchase",
  USER_REGISTERED_BUT_NOT_PURCHASED_BOOK = "user.registered.no.purchase.book",
  USER_REGISTERED_BUT_NOT_PURCHASED_INDICATOR = "user.registered.no.purchase.indicator",
}

export enum TriggerType {
  EVENT = "event",
  GROUP = "group",
}

export enum TargetGroup {
  ALL_STUDENTS = "all_students",
  UNPURCHASED_STUDENTS = "unpurchased_students",
  PURCHASED_STUDENTS = "purchased_students",
  BOOK_PURCHASED_USERS = "book_purchased_users",
  INDICATOR_PURCHASED_USERS = "indicator_purchased_users",
  NON_BOOK_PURCHASED_USERS = "non_book_purchased_users",
  NON_INDICATOR_PURCHASED_USERS = "non_indicator_purchased_users",
  SPECIFIC_COURSE_PURCHASED = "specific_course_purchased",
  SPECIFIC_COURSE_NOT_PURCHASED = "specific_course_not_purchased",
  SPECIFIC_BOOK_PURCHASED = "specific_book_purchased",
  SPECIFIC_BOOK_NOT_PURCHASED = "specific_book_not_purchased",
  SPECIFIC_INDICATOR_PURCHASED = "specific_indicator_purchased",
  SPECIFIC_INDICATOR_NOT_PURCHASED = "specific_indicator_not_purchased",
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

  @Prop({ type: String, required: false })
  product_type: "COURSE" | "BOOK" | "INDICATOR";

  @Prop({ type: String, required: false })
  product_id: string;

  @Prop({ type: [String], default: [] })
  traffic_sources: string[]; // facebook, youtube, tiktok, ads, google, etc.

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
