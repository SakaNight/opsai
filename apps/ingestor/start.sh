#!/bin/bash

# OpsAI Ingestor Service Startup Script

echo "🚀 Starting OpsAI Ingestor Service..."

# Check environment variables
if [ -z "$MONGO_URI" ]; then
    echo "⚠️  MONGO_URI not set, using default"
    export MONGO_URI="mongodb://admin:opsai123@localhost:27017/opsai?authSource=admin"
fi

if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL not set, using default"
    export REDIS_URL="redis://:opsai123@localhost:6379"
fi

if [ -z "$KAFKA_BROKERS" ]; then
    echo "⚠️  KAFKA_BROKERS not set, using default"
    export KAFKA_BROKERS="localhost:9092"
fi

# Create logs directory
mkdir -p logs

# Start service
echo "📡 Starting service on port ${PORT:-3001}..."
npm run start:dev
