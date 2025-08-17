import { Controller, Get } from '@nestjs/common';
import { KafkaService } from './services/kafka.service';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly kafkaService: KafkaService,
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async getHealth() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'opsai-ingestor',
      version: '1.0.0',
      checks: {
        kafka: 'unknown',
        database: 'unknown',
        redis: 'unknown',
      },
    };

    try {
      // Check Kafka health
      const kafkaStatus = this.kafkaService.getStatus();
      health.checks.kafka = kafkaStatus.isConnected ? 'ok' : 'error';
    } catch (error) {
      health.checks.kafka = 'error';
    }

    try {
      // Check database health
      const dbConnected = await this.databaseService.getConnectionStatus();
      health.checks.database = dbConnected ? 'ok' : 'error';
    } catch (error) {
      health.checks.database = 'error';
    }

    try {
      // Check Redis health
      const redisStatus = await this.redisService.getStatus();
      health.checks.redis = redisStatus.isConnected ? 'ok' : 'error';
    } catch (error) {
      health.checks.redis = 'error';
    }

    // Determine overall status
    const allChecks = Object.values(health.checks);
    if (allChecks.every(check => check === 'ok')) {
      health.status = 'ok';
    } else if (allChecks.some(check => check === 'error')) {
      health.status = 'error';
    } else {
      health.status = 'degraded';
    }

    return health;
  }

  @Get('ready')
  async getReadiness() {
    const readiness = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'opsai-ingestor',
      checks: {
        kafka: false,
        database: false,
        redis: false,
      },
    };

    try {
      // Check if all services are ready
      const kafkaStatus = this.kafkaService.getStatus();
      readiness.checks.kafka = kafkaStatus.isConnected;

      const dbConnected = await this.databaseService.getConnectionStatus();
      readiness.checks.database = dbConnected;

      const redisStatus = await this.redisService.getStatus();
      readiness.checks.redis = redisStatus.isConnected;

      // Service is ready if all critical services are available
      const allReady = Object.values(readiness.checks).every(check => check === true);
      readiness.status = allReady ? 'ready' : 'not_ready';

    } catch (error) {
      readiness.status = 'not_ready';
    }

    return readiness;
  }
}
