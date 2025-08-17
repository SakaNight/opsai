import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { LoggingService } from './logging.service';
import { KafkaService } from './kafka.service';

@Injectable()
export class GitHubIngestorService implements OnModuleInit {
  private readonly logger = new Logger(GitHubIngestorService.name);
  private lastEtag: string | null = null;
  private isRunning = false;

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private readonly loggingService: LoggingService,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.logger.log('GitHub Ingestor Service initialized');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollGitHubEvents() {
    if (this.isRunning) {
      this.logger.debug('GitHub polling already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      await this.fetchGitHubEvents();
    } catch (error) {
      this.logger.error('Error polling GitHub events:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async fetchGitHubEvents() {
    try {
      const url = process.env.GITHUB_EVENTS_API_URL || 'https://api.github.com/events';
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpsAI-Ingestor/1.0.0',
      };

      // 添加认证token（如果有）
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        headers['Authorization'] = `token ${token}`;
      }

      // 添加ETag支持
      if (this.lastEtag) {
        headers['If-None-Match'] = this.lastEtag;
      }

      const response = await axios.get(url, {
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 400,
      });

      // 检查是否有新内容
      if (response.status === 304) {
        this.logger.debug('No new GitHub events');
        return;
      }

      // 保存ETag
      const etag = response.headers.etag;
      if (etag) {
        this.lastEtag = etag;
      }

      const events = response.data;
      this.logger.log(`Fetched ${events.length} GitHub events`);

      // 处理事件
      for (const githubEvent of events) {
        await this.processGitHubEvent(githubEvent);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 304) {
          this.logger.debug('No new GitHub events (304)');
          return;
        }
        if (error.response?.status === 403) {
          this.logger.warn('GitHub API rate limit exceeded or unauthorized');
          return;
        }
      }
      throw error;
    }
  }

  private async processGitHubEvent(githubEvent: any) {
    try {
      // 分析事件严重性
      const severity = this.analyzeGitHubSeverity(githubEvent);
      
      // 创建事件记录
      const event = new this.eventModel({
        source: 'github',
        type: githubEvent.type,
        timestamp: new Date(githubEvent.created_at),
        raw: githubEvent,
        tags: this.extractGitHubTags(githubEvent),
        severity,
        service: 'github',
        summary: this.generateGitHubSummary(githubEvent),
        metadata: {
          user: githubEvent.actor?.login,
          repository: githubEvent.repo?.name,
          organization: githubEvent.org?.login,
          url: githubEvent.repo?.url,
          action: githubEvent.payload?.action,
        },
      });

      // 保存到数据库
      const savedEvent = await event.save();
      this.logger.debug(`Processed GitHub event: ${savedEvent._id}`);

      // 发送到Kafka
      await this.kafkaService.sendMessage('opsai-events', {
        eventId: savedEvent._id,
        source: 'github',
        severity,
        timestamp: savedEvent.timestamp,
        summary: savedEvent.summary,
      });

      // 记录日志
      await this.loggingService.logEvent('github', githubEvent.type, severity, savedEvent._id.toString());

      // 如果是高严重性事件，创建事件
      if (severity === 'high' || severity === 'critical') {
        await this.createIncidentFromEvent(savedEvent);
      }

    } catch (error) {
      this.logger.error('Error processing GitHub event:', error);
    }
  }

  private analyzeGitHubSeverity(githubEvent: any): string {
    const eventType = githubEvent.type;
    const payload = githubEvent.payload || {};
    
    // 检查安全相关事件
    if (eventType === 'SecurityAdvisoryEvent') {
      return 'critical';
    }

    // 检查代码扫描警报
    if (eventType === 'CodeScanningAlertEvent') {
      const severity = payload.alert?.rule?.security_severity;
      if (severity === 'critical' || severity === 'high') {
        return 'critical';
      }
      if (severity === 'medium') {
        return 'high';
      }
      return 'medium';
    }

    // 检查依赖更新
    if (eventType === 'DependabotAlertEvent') {
      const severity = payload.alert?.security_vulnerability?.severity;
      if (severity === 'critical' || severity === 'high') {
        return 'critical';
      }
      if (severity === 'medium') {
        return 'high';
      }
      return 'medium';
    }

    // 检查推送事件
    if (eventType === 'PushEvent') {
      const commits = payload.commits || [];
      const hasBreakingChanges = commits.some((commit: any) => 
        commit.message.toLowerCase().includes('breaking') ||
        commit.message.toLowerCase().includes('deprecate')
      );
      
      if (hasBreakingChanges) {
        return 'high';
      }
      
      // 检查是否推送到主分支
      const ref = payload.ref;
      if (ref === 'refs/heads/main' || ref === 'refs/heads/master') {
        return 'medium';
      }
    }

    // 检查Issues和PRs
    if (eventType === 'IssuesEvent' || eventType === 'PullRequestEvent') {
      const action = payload.action;
      if (action === 'opened' && payload.issue?.labels?.some((label: any) => 
        ['security', 'bug', 'critical'].includes(label.name.toLowerCase())
      )) {
        return 'high';
      }
    }

    return 'low';
  }

  private extractGitHubTags(githubEvent: any): string[] {
    const tags = ['github', githubEvent.type];
    
    const payload = githubEvent.payload || {};
    
    // 添加action标签
    if (payload.action) {
      tags.push(payload.action);
    }

    // 添加标签
    if (payload.issue?.labels) {
      payload.issue.labels.forEach((label: any) => {
        tags.push(`label:${label.name}`);
      });
    }

    // 添加用户标签
    if (githubEvent.actor?.type) {
      tags.push(`actor:${githubEvent.actor.type}`);
    }

    // 添加仓库标签
    if (githubEvent.repo?.private !== undefined) {
      tags.push(githubEvent.repo.private ? 'private' : 'public');
    }

    return tags;
  }

  private generateGitHubSummary(githubEvent: any): string {
    const eventType = githubEvent.type;
    const actor = githubEvent.actor?.login || 'Unknown';
    const repo = githubEvent.repo?.name || 'Unknown';
    const payload = githubEvent.payload || {};
    
    switch (eventType) {
      case 'PushEvent':
        const commits = payload.commits || [];
        const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
        return `${actor} pushed ${commits.length} commit(s) to ${repo}:${branch}`;
      
      case 'IssuesEvent':
        const action = payload.action || 'unknown';
        const issueTitle = payload.issue?.title || 'Unknown issue';
        return `${actor} ${action} issue "${issueTitle}" in ${repo}`;
      
      case 'PullRequestEvent':
        const prAction = payload.action || 'unknown';
        const prTitle = payload.pull_request?.title || 'Unknown PR';
        return `${actor} ${prAction} PR "${prTitle}" in ${repo}`;
      
      case 'SecurityAdvisoryEvent':
        const advisory = payload.security_advisory?.summary || 'Security advisory';
        return `Security advisory: ${advisory} in ${repo}`;
      
      case 'CodeScanningAlertEvent':
        const alert = payload.alert?.rule?.name || 'Code scanning alert';
        return `Code scanning alert: ${alert} in ${repo}`;
      
      default:
        return `${actor} performed ${eventType} in ${repo}`;
    }
  }

  private async createIncidentFromEvent(event: EventDocument) {
    try {
      // 这里可以调用事件处理服务来创建事件
      // 暂时简单记录
      this.logger.warn(`High severity GitHub event detected: ${event.summary}`);
    } catch (error) {
      this.logger.error('Error creating incident from GitHub event:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      source: 'github',
      lastEtag: this.lastEtag,
      lastPoll: new Date(),
    };
  }
}
