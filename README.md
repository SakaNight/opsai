# OpsAI – Realtime Incident & Knowledge Copilot (MVP 1)

> **MVP 1 Milestone**: NestJS API + Ingestor Service + Full Infrastructure Stack  
> Provides real-time event ingestion, incident management, and comprehensive observability.

---

## 🚀 Features

### Core Services
- **API Service** (`apps/api/`)
  - `GET /health` – Service health check (includes MongoDB connection status)
  - `GET /incidents` – List all incidents
  - `POST /incidents` – Create a new incident
  - GraphQL interface with Apollo
- **Ingestor Service** (`apps/ingestor/`) - **NEW! 🆕**
  - Real-time Wikimedia EventStream ingestion
  - GitHub Events API polling
  - Event processing and incident creation
  - Kafka/Redpanda event streaming support

### Data Models
- **Event Schema** - Comprehensive event tracking with metadata
- **Incident Schema** - Rich incident management with MTTR/MTTA metrics
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
- **Microservices Ready** - Service separation for scalability

---

## 🛠 Tech Stack

### Backend Framework
- **NestJS** - REST + GraphQL with Apollo
- **TypeScript** - Full type safety

### Data & Storage
- **MongoDB** - Primary database with Mongoose ODM
- **Redis** - Caching, rate limiting, and session management
- **Qdrant** - Vector database for AI/ML features

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
│   └── ingestor/           # Event ingestion service - NEW! 🆕
│       ├── src/
│       │   ├── services/   # Wikimedia, GitHub, Event Processing
│       │   ├── schemas/    # Event & Incident schemas
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
```

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
- **Infrastructure**: All services have health checks

## 📊 Current System Status

### ✅ Service Health (All Green)
- **MongoDB**: Connected with authentication ✅
- **Redis**: Connected with password protection ✅
- **Redpanda**: Kafka-compatible streaming operational ✅
- **API Service**: Running on port 3000 ✅
- **Ingestor Service**: Running on port 3002 ✅

### 📈 Event Processing Metrics
- **Total Events Processed**: 10,000+ Wikimedia events
- **Event Sources**: Wikimedia EventStream (real-time)
- **Processing Rate**: Continuous real-time ingestion
- **Data Storage**: MongoDB with optimized indexes
- **Message Queue**: Kafka topics with event streaming

### 🔄 Real-time Event Flow
```
Wikimedia EventStream → Ingestor Service → MongoDB Storage → Kafka Topics
     ↓                        ↓                ↓              ↓
Real-time changes    Event processing    Data persistence  Message streaming
```

## 🗺 Roadmap

### ✅ Completed (MVP 1)
- [x] Core API service with REST/GraphQL
- [x] Event ingestion service (Wikimedia + GitHub)
- [x] Event processing and incident creation
- [x] Full observability stack (Prometheus, Grafana, Loki)
- [x] Event streaming infrastructure (Redpanda)
- [x] Comprehensive data models and schemas

### 🎯 Latest Achievements (Today - 2025-08-16)
- [x] **MongoDB Authentication Issue Resolved** - Fixed connection string and user setup
- [x] **Kafka ObjectId Type Error Fixed** - Resolved data type issues in event streaming
- [x] **Complete Event Flow Validated** - End-to-end testing from ingestion to storage
- [x] **Real-time Event Processing Confirmed** - System handles high-frequency Wikimedia events
- [x] **Service Health Checks Verified** - All components (MongoDB, Redis, Redpanda) working
- [x] **Event Count**: 10,000+ Wikimedia events successfully processed and stored

### 🚧 In Progress
- [x] Redpanda configuration optimization ✅ **COMPLETED TODAY**
- [x] Event source configuration and testing ✅ **COMPLETED TODAY**
- [x] MongoDB authentication setup ✅ **COMPLETED TODAY**
- [x] Complete event flow validation ✅ **COMPLETED TODAY**

### 🔮 Next Milestones
- **MVP 2**: Knowledge Base & RAG Integration
  - Qdrant vector database setup
  - Document ingestion and chunking
  - Semantic search capabilities
- **MVP 3**: AI Agent & Automation
  - LangChain/LangGraph integration
  - Automated incident response
  - Intelligent recommendations
- **MVP 4**: Production Deployment
  - GCP Cloud Run deployment
  - CI/CD pipeline
  - Production monitoring

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB container is running
2. **Redpanda Issues**: Check Redpanda logs for configuration errors
3. **Port Conflicts**: Verify no other services are using required ports
4. **Service Dependencies**: Start infrastructure before services

### Recently Resolved Issues ✅
1. **MongoDB Authentication Error**: Fixed by recreating container and ensuring init script execution
2. **Kafka ObjectId Type Error**: Resolved by converting MongoDB ObjectId to string before sending to Kafka
3. **Event Flow Interruption**: Wikimedia events now process continuously without errors

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