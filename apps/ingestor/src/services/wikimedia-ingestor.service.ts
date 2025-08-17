import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { LoggingService } from './logging.service';
import { KafkaService } from './kafka.service';

@Injectable()
export class WikimediaIngestorService implements OnModuleInit {
  private readonly logger = new Logger(WikimediaIngestorService.name);
  private isRunning = false;
  private eventStream: any = null;

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private readonly loggingService: LoggingService,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Wikimedia Ingestor Service initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkHealth() {
    if (!this.isRunning) {
      this.logger.warn('Wikimedia event stream is not running, attempting to restart...');
      await this.startEventStream();
    }
  }

  async startEventStream() {
    if (this.isRunning) {
      this.logger.warn('Event stream is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.logger.log('Starting Wikimedia event stream...');

      const url = process.env.WIKIMEDIA_EVENTSTREAM_URL || 'https://stream.wikimedia.org/v2/stream/recentchange';
      
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'OpsAI-Ingestor/1.0.0',
          'Accept': 'text/event-stream',
        },
      });

      this.eventStream = response.data;
      
      this.eventStream.on('data', async (chunk: Buffer) => {
        try {
          const line = chunk.toString().trim();
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data !== '[heartbeat]') {
              await this.processWikimediaEvent(JSON.parse(data));
            }
          }
        } catch (error) {
          this.logger.error('Error processing Wikimedia event chunk:', error);
        }
      });

      this.eventStream.on('error', (error: any) => {
        this.logger.error('Wikimedia event stream error:', error);
        this.isRunning = false;
      });

      this.eventStream.on('end', () => {
        this.logger.warn('Wikimedia event stream ended');
        this.isRunning = false;
      });

      this.logger.log('Wikimedia event stream started successfully');
    } catch (error) {
      this.logger.error('Failed to start Wikimedia event stream:', error);
      this.isRunning = false;
    }
  }

  async stopEventStream() {
    if (this.eventStream) {
      this.eventStream.destroy();
      this.eventStream = null;
    }
    this.isRunning = false;
    this.logger.log('Wikimedia event stream stopped');
  }

  private async processWikimediaEvent(wikiEvent: any) {
    try {
      // Analyze event severity
      const severity = this.analyzeWikimediaSeverity(wikiEvent);
      
      // Create event record
      const event = new this.eventModel({
        source: 'wikimedia',
        type: 'change',
        timestamp: new Date(wikiEvent.meta.dt),
        raw: wikiEvent,
        tags: this.extractWikimediaTags(wikiEvent),
        severity,
        service: 'wikipedia',
        summary: this.generateWikimediaSummary(wikiEvent),
        metadata: {
          user: wikiEvent.user,
          title: wikiEvent.title,
          namespace: wikiEvent.namespace,
          comment: wikiEvent.comment,
          url: `https://${wikiEvent.meta.domain}${wikiEvent.meta.uri}`,
        },
      });

      // Save to database
      const savedEvent = await event.save();
      this.logger.debug(`Processed Wikimedia event: ${savedEvent._id}`);

      // Send to Kafka
      await this.kafkaService.sendMessage('opsai-events', {
        eventId: savedEvent._id.toString(),
        source: 'wikimedia',
        severity,
        timestamp: savedEvent.timestamp,
        summary: savedEvent.summary,
      });

      // Log event
      await this.loggingService.logEvent('wikimedia', 'change', severity, savedEvent._id.toString());

      // If it's a high severity event, create an incident
      if (severity === 'high' || severity === 'critical') {
        await this.createIncidentFromEvent(savedEvent);
      }

    } catch (error) {
      this.logger.error('Error processing Wikimedia event:', error);
    }
  }

  private analyzeWikimediaSeverity(wikiEvent: any): string {
    // Analyze edit type and content changes
    const isBot = wikiEvent.bot;
    const isMinor = wikiEvent.minor;
    const comment = (wikiEvent.comment || '').toLowerCase();
    
    // Check for sensitive keywords
    const sensitiveKeywords = ['vandalism', 'spam', 'attack', 'hack', 'security'];
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      comment.includes(keyword) || wikiEvent.title.toLowerCase().includes(keyword)
    );

    if (hasSensitiveContent) {
      return 'critical';
    }

    // Check if it's a mass edit
    if (wikiEvent.length && wikiEvent.length.old && wikiEvent.length.new) {
      const changeSize = Math.abs(wikiEvent.length.new - wikiEvent.length.old);
      if (changeSize > 10000) { // Changes exceeding 10KB
        return 'high';
      }
    }

    // Check if it's an important page
    const importantPages = ['main page', 'homepage', 'index'];
    if (importantPages.some(page => wikiEvent.title.toLowerCase().includes(page))) {
      return 'medium';
    }

    return 'low';
  }

  private extractWikimediaTags(wikiEvent: any): string[] {
    const tags = ['wikimedia', 'edit'];
    
    if (wikiEvent.bot) tags.push('bot');
    if (wikiEvent.minor) tags.push('minor');
    if (wikiEvent.type === 'new') tags.push('new-page');
    if (wikiEvent.type === 'edit') tags.push('edit-page');
    if (wikiEvent.type === 'log') tags.push('log-entry');
    
    // Add namespace tags
    if (wikiEvent.namespace === 0) tags.push('main-namespace');
    if (wikiEvent.namespace === 1) tags.push('talk-namespace');
    if (wikiEvent.namespace === 2) tags.push('user-namespace');
    if (wikiEvent.namespace === 3) tags.push('user-talk-namespace');
    
    return tags;
  }

  private generateWikimediaSummary(wikiEvent: any): string {
    const action = wikiEvent.type === 'new' ? 'created' : 'edited';
    const page = wikiEvent.title;
    const user = wikiEvent.user;
    const comment = wikiEvent.comment ? ` (${wikiEvent.comment})` : '';
    
    return `${page} was ${action} by ${user}${comment}`;
  }

  private async createIncidentFromEvent(event: EventDocument) {
    try {
      // Here we can call the event processing service to create events
      // For now, just log simply
      this.logger.warn(`High severity Wikimedia event detected: ${event.summary}`);
    } catch (error) {
      this.logger.error('Error creating incident from Wikimedia event:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      source: 'wikimedia',
      lastEvent: new Date(),
    };
  }
}
