import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../schemas/event.schema';
import { Incident, IncidentDocument } from '../schemas/incident.schema';
import { LoggingService } from './logging.service';
import { KafkaService } from './kafka.service';

@Injectable()
export class EventProcessorService implements OnModuleInit {
  private readonly logger = new Logger(EventProcessorService.name);
  private isProcessing = false;

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Incident.name) private incidentModel: Model<IncidentDocument>,
    private readonly loggingService: LoggingService,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Event Processor Service initialized');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPendingEvents() {
    if (this.isProcessing) {
      this.logger.debug('Event processing already in progress, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      await this.processEvents();
    } catch (error) {
      this.logger.error('Error processing events:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvents() {
    try {
      // Get pending events
      const pendingEvents = await this.eventModel
        .find({ status: 'pending' })
        .sort({ timestamp: 1 })
        .limit(100)
        .exec();

      if (pendingEvents.length === 0) {
        return;
      }

      this.logger.log(`Processing ${pendingEvents.length} pending events`);

      for (const event of pendingEvents) {
        try {
          await this.processSingleEvent(event);
        } catch (error) {
          this.logger.error(`Error processing event ${event._id}:`, error);
          
          // Mark event as failed
          event.status = 'failed';
          event.processingError = error.message;
          await event.save();
        }
      }
    } catch (error) {
      this.logger.error('Error in event processing loop:', error);
    }
  }

  private async processSingleEvent(event: EventDocument) {
    try {
      this.logger.debug(`Processing event: ${event._id} from ${event.source}`);

      // Analyze event and determine if incident should be created
      const incidentData = await this.analyzeEventForIncident(event);
      
      if (incidentData) {
        await this.createIncident(event, incidentData);
      }

      // Mark event as processed
      event.status = 'processed';
      event.processedAt = new Date();
      await event.save();

      // Log processing completion
      await this.loggingService.logEvent(
        event.source,
        event.type,
        event.severity,
        event._id.toString()
      );

      this.logger.debug(`Event ${event._id} processed successfully`);

    } catch (error) {
      this.logger.error(`Error processing event ${event._id}:`, error);
      throw error;
    }
  }

  private async analyzeEventForIncident(event: EventDocument): Promise<any | null> {
    // Analyze if incident should be created based on event severity and content
    if (event.severity === 'low') {
      return null; // Low severity events don't create incidents
    }

    const analysis = {
      shouldCreateIncident: false,
      incidentType: '',
      priority: event.severity,
      affectedServices: [],
      impact: '',
      rootCause: '',
      runbook: [],
    };

    // Analyze Wikimedia events
    if (event.source === 'wikimedia') {
      return this.analyzeWikimediaEvent(event, analysis);
    }

    // Analyze GitHub events
    if (event.source === 'github') {
      return this.analyzeGitHubEvent(event, analysis);
    }

    // Generic analysis logic
    return this.analyzeGenericEvent(event, analysis);
  }

  private analyzeWikimediaEvent(event: EventDocument, analysis: any): any | null {
    const raw = event.raw;
    
    // Check for sensitive content
    if (event.severity === 'critical') {
      analysis.shouldCreateIncident = true;
      analysis.incidentType = 'content_security';
      analysis.affectedServices = ['wikipedia'];
      analysis.impact = 'Potential content security threat detected';
      analysis.rootCause = 'Suspicious content modification';
      analysis.runbook = [
        'Review the modified content',
        'Check user history and patterns',
        'Consider content rollback if necessary',
        'Monitor for similar activities',
      ];
      return analysis;
    }

    // Check for mass edits
    if (event.severity === 'high' && raw.length) {
      const changeSize = Math.abs(raw.length.new - raw.length.old);
      if (changeSize > 50000) { // Changes above 50KB
        analysis.shouldCreateIncident = true;
        analysis.incidentType = 'mass_content_change';
        analysis.affectedServices = ['wikipedia'];
        analysis.impact = 'Large content modification detected';
        analysis.rootCause = 'Massive content change';
        analysis.runbook = [
          'Review the scope of changes',
          'Verify content accuracy',
          'Check for automated tools usage',
          'Monitor page for further changes',
        ];
        return analysis;
      }
    }

    return null;
  }

  private analyzeGitHubEvent(event: EventDocument, analysis: any): any | null {
    const raw = event.raw;
    
    // Security-related events
    if (event.severity === 'critical' || event.severity === 'high') {
      analysis.shouldCreateIncident = true;
      analysis.incidentType = 'security_alert';
      analysis.affectedServices = ['github', raw.repo?.name].filter(Boolean);
      analysis.impact = 'Security vulnerability or alert detected';
      analysis.rootCause = 'Security scan or dependency alert';
      analysis.runbook = [
        'Review the security alert details',
        'Assess vulnerability impact',
        'Plan remediation steps',
        'Update dependencies if needed',
        'Monitor for similar alerts',
      ];
      return analysis;
    }

    // Code quality issues
    if (event.type === 'CodeScanningAlertEvent' && event.severity === 'medium') {
      analysis.shouldCreateIncident = true;
      analysis.incidentType = 'code_quality';
      analysis.affectedServices = ['github', raw.repo?.name].filter(Boolean);
      analysis.impact = 'Code quality issue detected';
      analysis.rootCause = 'Static analysis alert';
      analysis.runbook = [
        'Review the code scanning alert',
        'Fix the identified issues',
        'Update code quality rules if needed',
        'Monitor alert trends',
      ];
      return analysis;
    }

    return null;
  }

  private analyzeGenericEvent(event: EventDocument, analysis: any): any | null {
    // Generic event analysis logic
    if (event.severity === 'critical') {
      analysis.shouldCreateIncident = true;
      analysis.incidentType = 'critical_event';
      analysis.affectedServices = [event.service || 'unknown'];
      analysis.impact = 'Critical event detected requiring immediate attention';
      analysis.rootCause = 'High severity event from external source';
      analysis.runbook = [
        'Assess event impact and scope',
        'Notify relevant stakeholders',
        'Implement immediate containment measures',
        'Investigate root cause',
        'Plan long-term resolution',
      ];
      return analysis;
    }

    return null;
  }

  private async createIncident(event: EventDocument, incidentData: any): Promise<void> {
    try {
      const incident = new this.incidentModel({
        title: `${incidentData.incidentType.replace(/_/g, ' ').toUpperCase()} - ${event.source}`,
        summary: event.summary,
        severity: incidentData.priority,
        status: 'open',
        source: event.source,
        service: event.service,
        tags: [...event.tags, incidentData.incidentType],
        raw: event.raw,
        eventIds: [event._id],
        metadata: event.metadata,
        impact: incidentData.impact,
        rootCause: incidentData.rootCause,
        affectedServices: incidentData.affectedServices,
        runbook: incidentData.runbook,
        detectedAt: event.timestamp,
      });

      const savedIncident = await incident.save();
      
      // Update event with incident ID
      event.incidentId = savedIncident._id as any;
      await event.save();

      // Send incident creation notification to Kafka
      await this.kafkaService.sendMessage('opsai-incidents', {
        incidentId: savedIncident._id,
        title: savedIncident.title,
        severity: savedIncident.severity,
        status: savedIncident.status,
        source: savedIncident.source,
        timestamp: (savedIncident as any).createdAt,
      });

      this.logger.log(`Created incident ${savedIncident._id} from event ${event._id}`);

    } catch (error) {
      this.logger.error(`Error creating incident from event ${event._id}:`, error);
      throw error;
    }
  }

  async getProcessingStats(): Promise<any> {
    try {
      const stats = await this.eventModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalEvents = await this.eventModel.countDocuments();
      const totalIncidents = await this.incidentModel.countDocuments();

      return {
        totalEvents,
        totalIncidents,
        eventStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        isProcessing: this.isProcessing,
      };
    } catch (error) {
      this.logger.error('Error getting processing stats:', error);
      throw error;
    }
  }
}
