import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  source: string; // wikimedia, github, usgs, statuspage, etc.

  @Prop({ required: true })
  type: string; // change, push, earthquake, incident, etc.

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object, required: true })
  raw: any; // Raw event data

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' })
  status: string;

  @Prop({ type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' })
  severity: string;

  @Prop()
  service?: string; // Related service name

  @Prop()
  summary?: string; // Event summary

  @Prop({ type: Object })
  metadata?: {
    location?: string;
    user?: string;
    repository?: string;
    magnitude?: number;
    url?: string;
    [key: string]: any;
  };

  @Prop({ type: Types.ObjectId, ref: 'Incident' })
  incidentId?: Types.ObjectId; // Associated incident ID

  @Prop()
  processingError?: string; // Processing error message

  @Prop({ type: Date })
  processedAt?: Date; // Processing completion time
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Create indexes
EventSchema.index({ source: 1, timestamp: -1 });
EventSchema.index({ type: 1, timestamp: -1 });
EventSchema.index({ status: 1 });
EventSchema.index({ severity: 1 });
EventSchema.index({ service: 1 });
EventSchema.index({ 'metadata.location': 1 });
EventSchema.index({ createdAt: -1 });
