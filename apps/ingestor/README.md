# OpsAI Ingestor Service

Event ingestion service responsible for real-time ingestion of event streams from multiple sources, with cleaning, analysis, and storage capabilities.

## 🚀 Features

- **Multi-source Event Ingestion**: Wikimedia EventStreams, GitHub Events API
- **Real-time Stream Processing**: SSE, Polling, Webhook support
- **Intelligent Event Analysis**: Automatic severity assessment, event classification
- **Event Processing Pipeline**: Event cleaning, transformation, storage
- **Incident Creation**: Automatic incident creation from high-severity events
- **Message Queue Integration**: Kafka/Redpanda event streaming
- **Observability**: Structured logging, metrics collection

## 🏗️ Architecture

```
External Sources → Ingestors → Event Processing → Storage + Kafka
     ↓                ↓              ↓              ↓
Wikimedia        Wikimedia    Event Analysis   MongoDB
GitHub           GitHub       Incident         Redis
StatusPage       StatusPage   Creation         Qdrant
```

## 📦 Dependencies

- **MongoDB**: Event and incident storage
- **Redis**: Caching and rate limiting
- **Redpanda/Kafka**: Event stream processing
- **Qdrant**: Vector database (future AI features)

## 🛠️ Quick Start

### 1. Environment Setup

Ensure local Docker environment is running:

```bash
cd infra/local
docker-compose up -d
```

### 2. Install Dependencies

```bash
cd apps/ingestor
npm install
```

### 3. Environment Variables

Create `.env` file:

```env
# Database
MONGO_URI=mongodb://admin:opsai123@localhost:27017/opsai?authSource=admin
REDIS_URL=redis://:opsai123@localhost:6379

# Message Queue
KAFKA_BROKERS=localhost:9092

# Event Sources
WIKIMEDIA_EVENTSTREAM_URL=https://stream.wikimedia.org/v2/stream/recentchange
GITHUB_EVENTS_API_URL=https://api.github.com/events
GITHUB_TOKEN=your-github-token

# Service Configuration
PORT=3001
LOG_LEVEL=info
```

### 4. Start Service

```bash
# Development mode
npm run start:dev

# Or use startup script
./start.sh
```

## 📡 API Endpoints

- `GET /api/v1/health` - Service health check
- `GET /api/v1/status` - Service status and statistics

## 🔍 Monitoring & Logging

### Log Locations
- Console output
- `logs/opsai-YYYY-MM-DD.log` - Date-rotated log files

### Monitoring Metrics
- Event ingestion rate
- Event processing latency
- Incident creation count
- Error rate and success rate

## 🎯 Event Source Configuration

### Wikimedia EventStreams
- Real-time monitoring of Wikipedia page changes
- Automatic detection of sensitive content and mass edits
- Content security threat detection support

### GitHub Events API
- Monitor code repository activities
- Security alerts and code quality detection
- Dependency updates and vulnerability scanning

## 🔧 Configuration Options

### Event Severity Thresholds
- `low`: Regular edits, minor changes
- `medium`: Important page changes, code quality alerts
- `high`: Mass changes, security alerts
- `critical`: Security threats, content vandalism

### Processing Frequency
- Wikimedia: Real-time stream processing
- GitHub: Every 5 minutes polling
- Event processing: Every 30 seconds batch processing

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failure**
   - Check Docker container status
   - Verify connection string and authentication

2. **Redis Connection Failure**
   - Check Redis container status
   - Verify password and port configuration

3. **Kafka Connection Failure**
   - Check Redpanda container status
   - Verify broker address and port

4. **Event Ingestion Failure**
   - Check network connectivity
   - Verify API keys and permissions
   - Review detailed error logs

### Log Analysis

```bash
# View latest logs
tail -f logs/opsai-$(date +%Y-%m-%d).log

# Search error logs
grep "ERROR" logs/opsai-*.log

# View events from specific source
grep "source.*wikimedia" logs/opsai-*.log
```

## 🔮 Future Plans

- [ ] Support more event sources (USGS earthquakes, StatusPage, etc.)
- [ ] AI-driven intelligent event classification
- [ ] Real-time event stream processing optimization
- [ ] Event deduplication and aggregation
- [ ] Custom event rule engine

## 📚 Related Documentation

- [Project Overview](../docs/ops_ai_realtime_incident_knowledge_copilot_project_planning_and_execution_manual_production_mvp.md)
- [API Service Documentation](../api/README.md)
- [Infrastructure Configuration](../../infra/local/README.md)
