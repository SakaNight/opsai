import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AgentController } from './controllers/agent.controller';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app: express.Application = express();
const port = process.env.PORT || 3003;

// 创建控制器实例
const agentController = new AgentController();

// 中间件
app.use(helmet()); // 安全头
app.use(cors()); // CORS支持
app.use(morgan('combined')); // 日志记录
app.use(express.json({ limit: '10mb' })); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码

// 健康检查路由
app.get('/health', (req, res) => {
  agentController.healthCheck(req, res);
});

// API路由
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

// 根路径
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

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 OpsAI Agent Service started on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔍 API docs: http://localhost:${port}/`);
  
  // 验证环境变量
  const requiredEnvVars = ['OPENAI_API_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Some features may not work properly without these variables.');
  }
  
  // 验证知识库连接
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

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

export default app;
