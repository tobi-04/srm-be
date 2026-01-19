import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum UserRole {
  ADMIN = "admin",
  SALE = "sale",
  USER = "user",
}

@Schema({ collection: "users", timestamps: false })
export class User extends BaseEntity {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false })
  must_change_password: boolean;

  // UTM Tracking - traffic source reference (first-touch attribution)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "TrafficSource",
    required: false,
  })
  traffic_source_id?: string;

  // First session ID when user registered
  @Prop({ required: false })
  first_session_id?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes
UserSchema.index({ name: "text" });
UserSchema.index({ is_deleted: 1, is_active: 1 });
