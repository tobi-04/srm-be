import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseEntity } from '../../../common/entities/base.entity';

@Schema({ collection: 'user_device_logins', timestamps: false })
export class UserDeviceLogin extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  device_id: string;

  @Prop({ required: true })
  device_name: string;

  @Prop({ required: true })
  device_type: string;

  @Prop({ required: true })
  device_token: string;

  @Prop({ type: String })
  refresh_token?: string;

  @Prop({ type: Date })
  last_login_at?: Date;
}

export type UserDeviceLoginDocument = HydratedDocument<UserDeviceLogin>;
export const UserDeviceLoginSchema = SchemaFactory.createForClass(UserDeviceLogin);

// Add indexes
UserDeviceLoginSchema.index({ user_id: 1 });
UserDeviceLoginSchema.index({ device_id: 1 });
UserDeviceLoginSchema.index({ user_id: 1, device_id: 1 }, { unique: true });
