import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IncidentDocument = Incident & Document;

@Schema({ timestamps: true })
export class Incident {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  summary: string;

  @Prop({ type: String, enum: ['low', 'medium', 'high', 'critical'], required: true })
  severity: string;

  @Prop({ type: String, enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'], default: 'open' })
  status: string;

  @Prop({ required: true })
  source: string; // Event source

  @Prop()
  service?: string; // Affected service

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, required: true })
  raw: any; // Raw event data

  @Prop({ type: [Types.ObjectId], ref: 'Event', default: [] })
  eventIds: Types.ObjectId[]; // Associated event IDs

  @Prop({ type: Object })
  metadata?: {
    location?: string;
    user?: string;
    repository?: string;
    magnitude?: number;
    url?: string;
    threshold?: number;
    current_value?: number;
    [key: string]: any;
  };

  @Prop()
  impact?: string; // Impact scope description

  @Prop()
  rootCause?: string; // Root cause

  @Prop({ type: [String], default: [] })
  affectedServices: string[]; // Affected services list

  @Prop({ type: Date })
  detectedAt?: Date; // Detection time

  @Prop({ type: Date })
  resolvedAt?: Date; // Resolution time

  @Prop()
  resolution?: string; // Resolution steps

  @Prop({ type: [String], default: [] })
  runbook?: string[]; // Runbook steps

  @Prop({ type: Number, default: 0 })
  mttr?: number; // Mean Time To Repair (minutes)

  @Prop({ type: Number, default: 0 })
  mtta?: number; // Mean Time To Acknowledge (minutes)

  @Prop({ type: Object })
  metrics?: {
    responseTime?: number;
    errorRate?: number;
    throughput?: number;
    [key: string]: any;
  };
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);

// Create indexes
IncidentSchema.index({ severity: 1, status: 1 });
IncidentSchema.index({ service: 1, createdAt: -1 });
IncidentSchema.index({ source: 1, createdAt: -1 });
IncidentSchema.index({ tags: 1 });
IncidentSchema.index({ createdAt: -1 });
IncidentSchema.index({ status: 1, createdAt: -1 });
IncidentSchema.index({ 'metadata.location': 1 });
