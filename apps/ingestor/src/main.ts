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

  // Add global exception filter for better error logging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Start service
  const port = process.env.PORT || 3002;
  await app.listen(port);

  console.log(`🚀 OpsAI Ingestor Service is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`📝 Logs: Check logs/ directory for detailed logs`);
  
  // Log service startup
  await loggingService.logEvent('system', 'startup', 'low', 'ingestor-service');
}

// Global exception filter for better error logging
class GlobalExceptionFilter {
  catch(exception: any, host: any) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    console.error('🚨 Global Exception Caught:');
    console.error('  URL:', request.url);
    console.error('  Method:', request.method);
    console.error('  Body:', request.body);
    console.error('  Error:', exception);
    console.error('  Stack:', exception.stack);
    
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? exception.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start Ingestor Service:', error);
  process.exit(1);
});
