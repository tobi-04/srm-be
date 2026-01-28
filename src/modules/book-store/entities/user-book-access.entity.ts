import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "user_book_access", timestamps: false })
export class UserBookAccess extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Book", required: true })
  book_id: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  granted_at: Date;
}

export type UserBookAccessDocument = HydratedDocument<UserBookAccess>;
export const UserBookAccessSchema =
  SchemaFactory.createForClass(UserBookAccess);

// Add indexes
UserBookAccessSchema.index({ user_id: 1, book_id: 1 }, { unique: true });
UserBookAccessSchema.index({ book_id: 1 });
