# OpsAI Agent Service

> **MVP 3**: AI Agent & Automation Service  
> Provides intelligent incident analysis, root cause analysis, and automated response generation using LangChain/LangGraph.

## 🚀 Features

### Core AI Capabilities
- **Event Analysis**: Intelligent classification and severity assessment
- **Root Cause Analysis**: Multi-hypothesis generation with confidence scoring
- **Resolution Suggestions**: Actionable step-by-step solutions
- **Automated Response**: Smart notification and escalation handling

### LangGraph Workflow
- **Sequential Processing**: Event → Analysis → Root Cause → Suggestions → Response
- **State Management**: Comprehensive workflow state tracking
- **Error Handling**: Graceful failure handling with detailed logging
- **Extensible Architecture**: Easy to add new workflow steps

### Knowledge Integration
- **Vector Search**: Integration with Qdrant vector database
- **Semantic Retrieval**: Intelligent knowledge matching
- **Filtered Search**: Service, severity, and tag-based filtering
- **Real-time Updates**: Dynamic knowledge base integration

## 🛠 Tech Stack

- **AI Framework**: LangChain + LangGraph
- **LLM**: OpenAI GPT-4
- **Vector Database**: Qdrant
- **Runtime**: Node.js + TypeScript
- **Web Framework**: Express.js
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, rate limiting

## 📦 Installation

### 1. Install Dependencies
```bash
cd apps/agent
pnpm install
```

### 2. Environment Configuration
Create a `.env` file based on the following template:

```bash
# Service Configuration
PORT=3003
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here

# MongoDB (for future workflow persistence)
MONGO_URI=mongodb://localhost:27017/opsai_agent

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=your_jwt_secret_here
API_KEY=your_api_key_here

# External Services
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
PAGERDUTY_API_KEY=your_pagerduty_api_key_here

# Monitoring
PROMETHEUS_PORT=9090
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

### 3. Start the Service
```bash
# Development mode
pnpm run start:dev

# Production build
pnpm run build
pnpm start
```

## 📡 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /` - API documentation and service info

### Workflow Management
- `POST /api/v1/workflow/execute` - Execute AI workflow
- `GET /api/v1/workflow/:workflowId/status` - Get workflow status
- `POST /api/v1/workflow/:workflowId/stop` - Stop running workflow

### Knowledge Search
- `POST /api/v1/knowledge/search` - Search knowledge base
- `GET /api/v1/knowledge/stats` - Get knowledge base statistics
- `GET /api/v1/knowledge/validate` - Validate knowledge base connection

## 🔧 Usage Examples

### Execute AI Workflow
```bash
curl -X POST http://localhost:3003/api/v1/workflow/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "eventId": "incident_001",
    "eventData": {
      "title": "Database connection timeout",
      "severity": "high",
      "service": "database",
      "description": "Users experiencing slow response times"
    }
  }'
```

### Search Knowledge Base
```bash
curl -X POST http://localhost:3003/api/v1/knowledge/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "database connection timeout",
    "filters": {
      "service": "database",
      "severity": "high"
    },
    "limit": 10
  }'
```

### Get Service Health
```bash
curl http://localhost:3003/health
```

## 🏗 Architecture

### Service Structure
```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic and AI workflows
├── schemas/         # Data models and validation
└── main.ts         # Application entry point
```

### Workflow Flow
```
Event Input → Event Analysis → Root Cause Analysis → 
Resolution Suggestions → Automated Response → Workflow Complete
```

### Integration Points
- **Ingestor Service**: Receives events for processing
- **API Service**: Provides incident data and status
- **Knowledge Base**: Qdrant vector database for intelligent retrieval
- **External Systems**: Slack, PagerDuty, email notifications

## 🔍 Monitoring & Observability

### Health Checks
- Service health endpoint with detailed status
- Knowledge base connection validation
- OpenAI API connectivity check

### Logging
- Structured logging with Morgan
- Request/response logging
- Error tracking and debugging

### Metrics (Future)
- Workflow execution times
- Success/failure rates
- API response times
- Knowledge search performance

## 🚧 Development

### Available Scripts
```bash
pnpm run start:dev    # Start in development mode
pnpm run build        # Build TypeScript to JavaScript
pnpm run start        # Start production server
pnpm run test         # Run tests
pnpm run lint         # Lint code
pnpm run lint:fix     # Fix linting issues
```

### Code Structure
- **TypeScript**: Full type safety and modern ES features
- **ESLint**: Code quality and consistency
- **Modular Design**: Clean separation of concerns
- **Error Handling**: Comprehensive error handling and validation

## 🔮 Future Enhancements

### Planned Features
- **Workflow Persistence**: MongoDB storage for workflow history
- **Advanced AI Models**: Support for multiple LLM providers
- **Real-time Streaming**: WebSocket support for live updates
- **Advanced Analytics**: Workflow performance insights
- **Integration APIs**: More external service connectors

### Scalability Improvements
- **Horizontal Scaling**: Multiple agent instances
- **Queue Management**: Redis-based job queuing
- **Caching Layer**: Intelligent response caching
- **Load Balancing**: Distributed workflow execution

## 🐛 Troubleshooting

### Common Issues
1. **OpenAI API Key**: Ensure valid API key is set
2. **Qdrant Connection**: Verify vector database is running
3. **Port Conflicts**: Check if port 3003 is available
4. **Dependencies**: Ensure all packages are installed

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm run start:dev
```

### Health Check
Monitor the `/health` endpoint to verify service status and dependencies.

## 📚 Related Documentation

- [OpsAI Project Overview](../README.md)
- [API Service Documentation](../api/README.md)
- [Ingestor Service Documentation](../ingestor/README.md)
- [Project Planning Document](../../docs/ops_ai_realtime_incident_knowledge_copilot_project_planning_and_execution_manual_production_mvp.md)

## 📄 License

MIT © 2025 AriesChen
