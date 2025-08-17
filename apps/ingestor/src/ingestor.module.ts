import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { WikimediaIngestorService } from './services/wikimedia-ingestor.service';
import { GitHubIngestorService } from './services/github-ingestor.service';
import { EventProcessorService } from './services/event-processor.service';
import { KafkaService } from './services/kafka.service';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { LoggingService } from './services/logging.service';
import { HealthController } from './health.controller';

import { Event, EventSchema } from './schemas/event.schema';
import { Incident, IncidentSchema } from './schemas/incident.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/opsai'),
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Incident.name, schema: IncidentSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    WikimediaIngestorService,
    GitHubIngestorService,
    EventProcessorService,
    KafkaService,
    DatabaseService,
    RedisService,
    LoggingService,
  ],
  exports: [
    WikimediaIngestorService,
    GitHubIngestorService,
    EventProcessorService,
    KafkaService,
    DatabaseService,
    RedisService,
    LoggingService,
  ],
})
export class IngestorModule {}
