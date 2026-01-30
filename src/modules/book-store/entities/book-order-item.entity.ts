import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

@Schema({ collection: "book_order_items", timestamps: false })
export class BookOrderItem extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "BookOrder", required: true })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Book", required: true })
  book_id: Types.ObjectId;

  @Prop({ required: true })
  book_title: string;

  @Prop({ required: true, min: 0 })
  price: number;
}

export type BookOrderItemDocument = HydratedDocument<BookOrderItem>;
export const BookOrderItemSchema = SchemaFactory.createForClass(BookOrderItem);

// Add indexes
BookOrderItemSchema.index({ order_id: 1 });
BookOrderItemSchema.index({ book_id: 1 });
