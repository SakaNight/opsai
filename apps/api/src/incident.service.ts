import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Incident, IncidentDocument } from './schemas/incident.schema';
import { Model } from 'mongoose';

@Injectable()
export class IncidentService {
  constructor(@InjectModel(Incident.name) private model: Model<IncidentDocument>) {}

  create(input: Partial<Incident>) { return this.model.create(input); }
  list() { return this.model.find().sort({ createdAt: -1 }).lean(); }
}