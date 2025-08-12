import { Body, Controller, Get, Post } from '@nestjs/common';
import { IncidentService } from './incident.service';

@Controller('incidents')
export class IncidentController {
  constructor(private readonly svc: IncidentService) {}

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Get()
  list() { return this.svc.list(); }
}