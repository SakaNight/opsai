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
      // 分析事件严重性
      const severity = this.analyzeWikimediaSeverity(wikiEvent);
      
      // 创建事件记录
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

      // 保存到数据库
      const savedEvent = await event.save();
      this.logger.debug(`Processed Wikimedia event: ${savedEvent._id}`);

      // 发送到Kafka
      await this.kafkaService.sendMessage('opsai-events', {
        eventId: savedEvent._id,
        source: 'wikimedia',
        severity,
        timestamp: savedEvent.timestamp,
        summary: savedEvent.summary,
      });

      // 记录日志
      await this.loggingService.logEvent('wikimedia', 'change', severity, savedEvent._id.toString());

      // 如果是高严重性事件，创建事件
      if (severity === 'high' || severity === 'critical') {
        await this.createIncidentFromEvent(savedEvent);
      }

    } catch (error) {
      this.logger.error('Error processing Wikimedia event:', error);
    }
  }

  private analyzeWikimediaSeverity(wikiEvent: any): string {
    // 分析编辑类型和内容变化
    const isBot = wikiEvent.bot;
    const isMinor = wikiEvent.minor;
    const comment = (wikiEvent.comment || '').toLowerCase();
    
    // 检查是否有敏感关键词
    const sensitiveKeywords = ['vandalism', 'spam', 'attack', 'hack', 'security'];
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      comment.includes(keyword) || wikiEvent.title.toLowerCase().includes(keyword)
    );

    if (hasSensitiveContent) {
      return 'critical';
    }

    // 检查是否是大规模编辑
    if (wikiEvent.length && wikiEvent.length.old && wikiEvent.length.new) {
      const changeSize = Math.abs(wikiEvent.length.new - wikiEvent.length.old);
      if (changeSize > 10000) { // 超过10KB的变化
        return 'high';
      }
    }

    // 检查是否是重要页面
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
    
    // 添加命名空间标签
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
      // 这里可以调用事件处理服务来创建事件
      // 暂时简单记录
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
