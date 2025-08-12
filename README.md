# OpsAI – Realtime Incident & Knowledge Copilot (MVP 0)

> **MVP 0 Baseline**: NestJS API (REST + GraphQL) + MongoDB (Docker)  
> Provides basic `Incident` model CRUD via both REST and GraphQL interfaces.

---

## 🚀 Features
- **REST API**
  - `GET /health` – Service health check (includes MongoDB connection status)
  - `GET /incidents` – List all incidents
  - `POST /incidents` – Create a new incident
- **GraphQL API**
  - `query { health }`
  - `query { incidents { ...fields } }`
  - `mutation { createIncident(input: {...}) { ...fields } }`
- **MongoDB Integration** – Using Mongoose connected to a local Docker Mongo instance
- **Local Infrastructure with Docker Compose** – MongoDB, Redis, Qdrant (pre-configured for future use)
- **Extensible Monorepo Structure** – pnpm workspaces with `apps` and `packages`

---

## 🛠 Tech Stack
- **Backend Framework**: [NestJS](https://nestjs.com/) (REST + GraphQL with Apollo)
- **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm
- **Containerization**: Docker + docker-compose
- **Other Services**: Redis, Qdrant (future integration)

---

## 📂 Project Structure
```bash
opsai/
├── apps/
│   └── api/                # NestJS API service
│       ├── src/
│       │   ├── health.*    # Health check (REST + GraphQL)
│       │   ├── incident.*  # Incident CRUD logic
│       │   └── schemas/    # Mongoose schemas
├── infra/local/            # Local docker-compose setup
├── packages/               # Shared libraries (to be added)
└── …
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

### 3️⃣ Start infrastructure (MongoDB, Redis, Qdrant)
```bash
cd infra/local
docker compose up -d
```

### 4️⃣ Configure environment variables
In apps/api/ create .env:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/opsai
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333
```

### 5️⃣ Start the API service
```bash
pnpm dev:api
```

## 📡 API Examples
### REST
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

### GraphQL
Go to http://localhost:3000/graphql in your browser.
```bash
# Health check
query {
  health
}

# Create an Incident
mutation {
  createIncident(input: { title: "DB connection pool exhausted", severity: "critical", source: "grafana" }) {
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

## 🗺 Roadmap
	•	Add packages/shared with Zod schemas + shared TypeScript types
	•	Create apps/ingestor service for external event ingestion
	•	Initialize Qdrant collection for vector search
	•	Add CI/CD (GitHub Actions) and test coverage


## 📜 License
MIT © 2025 AriesChen