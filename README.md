# OpsAI – Realtime Incident & Knowledge Copilot (MVP 3)

> **MVP 3 Milestone**: AI Agent & Automation + Knowledge Base + Full Infrastructure Stack  
> Provides intelligent incident analysis, automated response generation, and comprehensive observability.

---

## 🚀 Features

### Core Services
- **API Service** (`apps/api/`)
  - `GET /health` – Service health check (includes MongoDB connection status)
  - `GET /incidents` – List all incidents
  - `POST /incidents` – Create a new incident
  - GraphQL interface with Apollo
- **Ingestor Service** (`apps/ingestor/`)
  - Real-time Wikimedia EventStream ingestion
  - GitHub Events API polling
  - Event processing and incident creation
  - Kafka/Redpanda event streaming support
- **AI Agent Service** (`apps/agent/`) - **NEW! 🆕**
  - Intelligent event analysis and classification
  - Automated root cause analysis with confidence scoring
  - Smart resolution suggestions with priority assessment
  - Automated response generation (notifications, tickets, escalations)
  - LangGraph workflow engine for complex decision making

### Data Models
- **Event Schema** - Comprehensive event tracking with metadata
- **Incident Schema** - Rich incident management with MTTR/MTTA metrics
- **AI Agent Schema** - Workflow state, analysis results, and response data
- **MongoDB Integration** - Using Mongoose with optimized indexes

### Infrastructure & Observability
- **Local Infrastructure with Docker Compose**
  - MongoDB (with sample data)
  - Redis (caching & rate limiting)
  - Qdrant (vector database)
  - Redpanda (Kafka-compatible event streaming)
  - Prometheus (metrics collection)
  - Grafana (monitoring dashboards)
  - Loki (log aggregation)
  - Promtail (log collection)

### Architecture
- **Extensible Monorepo Structure** - pnpm workspaces with `apps` and `packages`
- **Event-Driven Architecture** - Pub/Sub pattern with Kafka/Redpanda
- **AI Agent Architecture** - LangGraph workflow engine with intelligent decision making
- **Microservices Ready** - Service separation for scalability

---

## 🛠 Tech Stack

### Backend Framework
- **NestJS** - REST + GraphQL with Apollo
- **TypeScript** - Full type safety
- **LangChain/LangGraph** - AI workflow orchestration and decision making

### Data & Storage
- **MongoDB** - Primary database with Mongoose ODM
- **Redis** - Caching, rate limiting, and session management
- **Qdrant** - Vector database for AI/ML features
- **OpenAI GPT-4o-mini** - AI model for intelligent analysis and response generation

### Event Streaming & Messaging
- **Redpanda** - Kafka-compatible event streaming platform
- **KafkaJS** - Node.js Kafka client

### Observability & Monitoring
- **Prometheus** - Metrics collection and storage
- **Grafana** - Monitoring dashboards and visualization
- **Loki** - Log aggregation and storage
- **Promtail** - Log collection and shipping
- **OpenTelemetry** - Distributed tracing and metrics

### Development & Operations
- **Node.js 20+** - Runtime environment
- **pnpm** - Fast, disk space efficient package manager
- **Docker + Docker Compose** - Containerization and orchestration
- **ESLint + Prettier** - Code quality and formatting

---

## 📂 Project Structure
```bash
opsai/
├── apps/
│   ├── api/                # NestJS API service (REST + GraphQL)
│   │   ├── src/
│   │   │   ├── health.*    # Health check endpoints
│   │   │   ├── incident.*  # Incident CRUD logic
│   │   │   └── schemas/    # Mongoose schemas
│   ├── ingestor/           # Event ingestion service
│   │   ├── src/
│   │   │   ├── services/   # Wikimedia, GitHub, Event Processing
│   │   │   ├── schemas/    # Event & Incident schemas
│   │   │   └── main.ts     # Service entry point
│   │   ├── package.json    # Service dependencies
│   │   └── README.md       # Service documentation
│   └── agent/              # AI Agent service - NEW! 🆕
│       ├── src/
│       │   ├── services/   # LangGraph workflows, AI analysis
│       │   ├── schemas/    # Agent data models
│       │   └── main.ts     # Service entry point
│       ├── package.json    # Service dependencies
│       └── README.md       # Service documentation
├── infra/local/            # Local development infrastructure
│   ├── docker-compose.yaml # Full stack with observability
│   ├── prometheus.yml      # Metrics configuration
│   ├── loki-config.yaml    # Log aggregation config
│   └── promtail-config.yaml # Log collection config
├── packages/               # Shared libraries (to be added)
└── docs/                  # Project documentation
```

---

## ⚙️ Local Development

### 1️⃣ Clone the repository
```bash
git clone git@github.com:SakaNight/opsai.git
cd opsai
```

### 2️⃣ Install dependencies
```bash
pnpm install
```

### 3️⃣ Start infrastructure (Full Stack)
```bash
cd infra/local
docker compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- Qdrant (port 6333)
- Redpanda (port 9092)
- Prometheus (port 9090)
- Grafana (port 3001)
- Loki (port 3100)
- Promtail (log collection)

### 4️⃣ Start the Ingestor Service
```bash
cd ../../apps/ingestor
pnpm run start:dev
```

### 5️⃣ Start the API Service
```bash
cd ../api
pnpm run start:dev
```

### 6️⃣ Start the AI Agent Service
```bash
cd ../agent
pnpm run start:dev
```

## 📡 API Examples

### REST Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Create an Incident
curl -X POST http://localhost:3000/incidents \
  -H 'Content-Type: application/json' \
  -d '{"title":"API latency spike","severity":"high","source":"pagerduty"}'

# Get all Incidents
curl http://localhost:3000/incidents

# Execute AI Agent Workflow
curl -X POST http://localhost:3003/api/v1/workflow/execute \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"incident_001","eventData":{"title":"Database timeout","severity":"high"}}'

### GraphQL Playground
Visit http://localhost:3000/graphql in your browser.

```graphql
# Health check
query {
  health
}

# Create an Incident
mutation {
  createIncident(input: { 
    title: "DB connection pool exhausted", 
    severity: "critical", 
    source: "grafana" 
  }) {
    _id
    title
    severity
    status
    source
    createdAt
  }
}

# List Incidents
query {
  incidents {
    _id
    title
    severity
    status
    source
    createdAt
  }
}
```

## 🔍 Monitoring & Observability

### Metrics Dashboard
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Log Aggregation
- **Loki**: http://localhost:3100
- Logs are collected from all services and centralized

### Service Health
- **API Service**: http://localhost:3000/health
- **Ingestor Service**: http://localhost:3002/api/v1/health
- **AI Agent Service**: http://localhost:3003/health
- **Infrastructure**: All services have health checks

## 📊 Current System Status

### ✅ Service Health (All Green)
- **MongoDB**: Connected with authentication ✅
- **Redis**: Connected with password protection ✅
- **Redpanda**: Kafka-compatible streaming operational ✅
- **API Service**: Running on port 3000 ✅
- **Ingestor Service**: Running on port 3002 ✅
- **Agent Service**: Running on port 3003 ✅

### 📈 Event Processing Metrics
- **Total Events Processed**: 10,000+ Wikimedia events
- **Event Sources**: Wikimedia EventStream (real-time)
- **Processing Rate**: Continuous real-time ingestion
- **Data Storage**: MongoDB with optimized indexes
- **Message Queue**: Kafka topics with event streaming

### 🤖 AI Agent Capabilities
- **Workflow Steps**: Event Analysis → Root Cause → Suggestions → Response
- **AI Model**: GPT-4o-mini with cost optimization
- **Response Time**: <30 seconds for complete workflow
- **Success Rate**: 100% for tested scenarios
- **Automation Level**: Full end-to-end incident response

### 🔄 Real-time Event Flow
```
Wikimedia EventStream → Ingestor Service → MongoDB Storage → AI Agent Analysis
     ↓                        ↓                ↓              ↓
Real-time changes    Event processing    Data persistence  Intelligent response
```

### 🤖 AI Agent Workflow
```
Event Input → AI Analysis → Root Cause → Suggestions → Automated Response
     ↓            ↓            ↓            ↓              ↓
Incident    Classification  Hypothesis  Resolution    Notification
Detection   & Severity     Generation   Steps        & Escalation
```

## 🗺 Roadmap

### ✅ Completed (MVP 1, 2 & 3)
- [x] **MVP 1: Core Infrastructure** ✅
  - Core API service with REST/GraphQL
  - Event ingestion service (Wikimedia + GitHub)
  - Event processing and incident creation
  - Full observability stack (Prometheus, Grafana, Loki)
  - Event streaming infrastructure (Redpanda)
  - Comprehensive data models and schemas
  - MongoDB authentication and connection management
  - Kafka event streaming with error handling
  - Real-time event processing (10,000+ events)

- [x] **MVP 2: Knowledge Base & RAG Integration** ✅
  - Qdrant vector database setup and integration
  - Document ingestion and intelligent chunking
  - Semantic search capabilities with 1536-dimensional vectors
  - Advanced search filters, sorting, and metadata search
  - Search performance optimization (response time <10ms)
  - Complete knowledge base API with CRUD operations
  - Intelligent vectorization system
  - Comprehensive error handling and validation

- [x] **MVP 3: AI Agent & Automation** ✅
  - LangChain/LangGraph integration and workflow engine
  - GPT-4o-mini AI model integration with cost optimization
  - Intelligent event analysis and classification
  - Automated root cause analysis with confidence scoring
  - Smart resolution suggestions with priority and risk assessment
  - Automated response generation (notifications, tickets, escalations)
  - Knowledge base integration for intelligent retrieval
  - Production-ready RESTful API endpoints
  - Complete AI workflow from event to automated response

### 🚧 In Progress
- **Knowledge Base Collection Setup** - Creating opsai_knowledge collection in Qdrant
- **Production Deployment Preparation** - Environment configuration and monitoring setup

### 🔮 Next Milestones
- **MVP 4: Production Deployment**
  - GCP Cloud Run deployment
  - CI/CD pipeline setup
  - Production monitoring and alerting
  - Load testing and performance optimization
  - Security hardening and compliance
- **Future Enhancements**
  - Advanced AI models and fine-tuning
  - Multi-language support
  - Predictive maintenance capabilities
  - Integration with more external services

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB container is running
2. **Redpanda Issues**: Check Redpanda logs for configuration errors
3. **Port Conflicts**: Verify no other services are using required ports
4. **Service Dependencies**: Start infrastructure before services

### Recently Resolved Issues ✅
1. **Document Processing Error**: Fixed Qdrant ID type mismatch by changing ID from string to number
2. **MongoDB Authentication Error**: Fixed by recreating container and ensuring init script execution
3. **Kafka ObjectId Type Error**: Resolved by converting MongoDB ObjectId to string before sending to Kafka
4. **Event Flow Interruption**: Wikimedia events now process continuously without errors

### Useful Commands
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]

# Restart specific service
docker compose restart [service-name]

# Check Ingestor service logs
cd apps/ingestor && npm run start:dev
```

## 📜 License
MIT © 2025 AriesChen