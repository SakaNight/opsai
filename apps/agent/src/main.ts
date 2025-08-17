import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AgentController } from './controllers/agent.controller';

// Load environment variables
dotenv.config();

// Create Express application
const app: express.Application = express();
const port = process.env.PORT || 3003;

// Create controller instance
const agentController = new AgentController();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoding

// Health check route
app.get('/health', (req, res) => {
  agentController.healthCheck(req, res);
});

// API routes
app.post('/api/v1/workflow/execute', (req, res) => {
  agentController.executeWorkflow(req, res);
});

app.get('/api/v1/workflow/:workflowId/status', (req, res) => {
  agentController.getWorkflowStatus(req, res);
});

app.post('/api/v1/workflow/:workflowId/stop', (req, res) => {
  agentController.stopWorkflow(req, res);
});

app.post('/api/v1/knowledge/search', (req, res) => {
  agentController.searchKnowledge(req, res);
});

app.get('/api/v1/knowledge/stats', (req, res) => {
  agentController.getKnowledgeStats(req, res);
});

app.get('/api/v1/knowledge/validate', (req, res) => {
  agentController.validateKnowledgeConnection(req, res);
});

// Root path
app.get('/', (req, res) => {
  res.json({
    service: 'OpsAI Agent Service',
    version: '1.0.0',
    description: 'AI Agent service for incident analysis and automation',
    endpoints: {
      health: '/health',
      workflow: {
        execute: 'POST /api/v1/workflow/execute',
        status: 'GET /api/v1/workflow/:workflowId/status',
        stop: 'POST /api/v1/workflow/:workflowId/stop',
      },
      knowledge: {
        search: 'POST /api/v1/knowledge/search',
        stats: 'GET /api/v1/knowledge/stats',
        validate: 'GET /api/v1/knowledge/validate',
      },
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 OpsAI Agent Service started on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔍 API docs: http://localhost:${port}/`);
  
  // Validate environment variables
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Some features may not work properly without these variables.');
  }
  
  // Validate knowledge base connection
  setTimeout(async () => {
    try {
      const controller = new AgentController();
      await controller.validateKnowledgeConnection({} as any, {
        status: (code: number) => ({ json: (data: any) => {
          if (code === 200) {
            console.log('✅ Knowledge base connection validated');
          } else {
            console.warn('⚠️  Knowledge base connection failed');
          }
        }})
      } as any);
    } catch (error) {
      console.warn('⚠️  Could not validate knowledge base connection');
    }
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

export default app;
