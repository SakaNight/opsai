import { NestFactory } from '@nestjs/core';
import { IngestorModule } from './ingestor.module';
import { LoggingService } from './services/logging.service';

async function bootstrap() {
  const app = await NestFactory.create(IngestorModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const loggingService = app.get(LoggingService);
  
  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Start service
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 OpsAI Ingestor Service is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`📝 Logs: Check logs/ directory for detailed logs`);
  
  // Log service startup
  await loggingService.logEvent('system', 'startup', 'low', 'ingestor-service');
}

bootstrap().catch((error) => {
  console.error('Failed to start Ingestor Service:', error);
  process.exit(1);
});
