#!/bin/bash

# OpsAI Agent Service Startup Script

echo "🚀 Starting OpsAI Agent Service..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
# OpsAI Agent Service Environment Variables

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
EOF
    echo "📝 Please update the .env file with your actual configuration values"
    echo "⚠️  At minimum, set OPENAI_API_KEY to proceed"
    exit 1
fi

# 检查OpenAI API Key
if grep -q "your_openai_api_key_here" .env; then
    echo "❌ Please set your OpenAI API key in the .env file"
    exit 1
fi

# 启动服务
echo "🚀 Starting Agent service in development mode..."
echo "📊 Service will be available at: http://localhost:3003"
echo "🔍 Health check: http://localhost:3003/health"
echo "📚 API docs: http://localhost:3003/"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

pnpm run start:dev
