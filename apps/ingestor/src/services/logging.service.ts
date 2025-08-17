import { Injectable, Logger } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private winstonLogger: winston.Logger;

  constructor() {
    this.initializeWinston();
  }

  private initializeWinston() {
    this.winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: 'logs/opsai-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  async logEvent(source: string, type: string, severity: string, eventId: string): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        source,
        type,
        severity,
        eventId,
        message: `Event processed: ${source}/${type} with severity ${severity}`,
      };

      this.winstonLogger.info(logEntry);
      this.logger.debug(`Event logged: ${source}/${type} - ${eventId}`);
    } catch (error) {
      this.logger.error('Failed to log event:', error);
    }
  }

  async logError(source: string, error: Error, context?: any): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        source,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context,
        message: `Error in ${source}: ${error.message}`,
      };

      this.winstonLogger.error(logEntry);
      this.logger.error(`Error logged: ${source} - ${error.message}`);
    } catch (logError) {
      this.logger.error('Failed to log error:', logError);
    }
  }

  async logMetric(source: string, metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        source,
        metric,
        value,
        tags,
        message: `Metric recorded: ${source}/${metric} = ${value}`,
      };

      this.winstonLogger.info(logEntry);
      this.logger.debug(`Metric logged: ${source}/${metric} = ${value}`);
    } catch (error) {
      this.logger.error('Failed to log metric:', error);
    }
  }

  getWinstonLogger(): winston.Logger {
    return this.winstonLogger;
  }
}
