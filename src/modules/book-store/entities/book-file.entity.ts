import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum BookFileType {
  PDF = "PDF",
  EPUB = "EPUB",
}

@Schema({ collection: "book_files", timestamps: false })
export class BookFile extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: "Book", required: true })
  book_id: Types.ObjectId;

  @Prop({ required: true })
  file_path: string;

  @Prop({ type: String, enum: BookFileType, required: true })
  file_type: BookFileType;

  @Prop({ required: true })
  file_size: number;
}

export type BookFileDocument = HydratedDocument<BookFile>;
export const BookFileSchema = SchemaFactory.createForClass(BookFile);

// Add indexes
BookFileSchema.index({ book_id: 1 });
