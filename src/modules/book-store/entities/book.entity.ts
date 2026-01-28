import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum BookStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
}

@Schema({ collection: "books", timestamps: false })
export class Book extends BaseEntity {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: "" })
  description: string;

  @Prop({ default: "" })
  cover_image: string;

  @Prop({ required: true, min: 0, default: 0 })
  price: number;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  discount_percentage: number;

  @Prop({ type: String, enum: BookStatus, default: BookStatus.DRAFT })
  status: BookStatus;
}

export type BookDocument = HydratedDocument<Book>;
export const BookSchema = SchemaFactory.createForClass(Book);

// Add indexes
BookSchema.index({ title: "text", description: "text" });
BookSchema.index({ status: 1, is_deleted: 1 });
BookSchema.index({ slug: 1 });
BookSchema.index({ price: 1 });
