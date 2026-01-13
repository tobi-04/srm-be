import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BaseEntity } from '../../../common/entities/base.entity';

@Schema({ collection: 'audit_logs', timestamps: false })
export class AuditLog extends BaseEntity {
  @Prop({ required: true })
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'READ', etc.

  @Prop({ required: true })
  entity: string; // 'User', 'Product', etc.

  @Prop({ type: Types.ObjectId })
  entity_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  user_id: Types.ObjectId;

  @Prop({ type: Object })
  old_data: Record<string, any>;

  @Prop({ type: Object })
  new_data: Record<string, any>;

  @Prop()
  ip_address: string;

  @Prop()
  user_agent: string;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Additional context
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Add indexes for efficient querying
AuditLogSchema.index({ entity: 1, entity_id: 1 });
AuditLogSchema.index({ user_id: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ created_at: -1 });
AuditLogSchema.index({ is_deleted: 1 });
