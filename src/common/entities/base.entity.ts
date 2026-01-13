import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types, HydratedDocument } from 'mongoose';

@Schema({ timestamps: false })
export abstract class BaseEntity {
  _id: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;

  @Prop({ type: Boolean, default: false })
  is_deleted: boolean;
}

export type BaseDocument<T> = HydratedDocument<T & BaseEntity>;
