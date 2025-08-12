import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IncidentDocument = HydratedDocument<Incident>;

@Schema({ timestamps: true })
export class Incident {
  @Prop({ required: true }) title: string;
  @Prop({ enum: ['low','medium','high','critical'], default: 'low' }) severity: string;
  @Prop({ enum: ['open','ack','resolved'], default: 'open' }) status: string;
  @Prop() source?: string;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);