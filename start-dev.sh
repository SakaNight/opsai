#!/bin/bash

# OpsAI Development Startup Script
# Usage: ./start-dev.sh [service]

echo "🚀 OpsAI Development Environment Startup Script"
echo "================================"

# Check if in project root directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ Error: Please run this script in the project root directory"
    echo "Current directory: $(pwd)"
    echo "Please execute: cd /Users/arieschan/Desktop/Work/Project/opsai"
    exit 1
fi

echo "✅ Project root directory confirmed: $(pwd)"

# Check infrastructure status
echo ""
echo "🔍 Checking infrastructure status..."
if docker compose -f infra/local/docker-compose.yaml ps | grep -q "Up"; then
    echo "✅ Docker infrastructure is running"
else
    echo "⚠️  Docker infrastructure is not running, starting..."
    docker compose -f infra/local/docker-compose.yaml up -d
    echo "⏳ Waiting for infrastructure to start..."
    sleep 10
fi

# Check service status
echo ""
echo "🔍 Checking service status..."

# Check API service
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API service is running (port 3000)"
else
    echo "❌ API service is not running (port 3000)"
fi

# Check Ingestor service
if curl -s http://localhost:3002/api/v1/health > /dev/null 2>&1; then
    echo "✅ Ingestor service is running (port 3002)"
else
    echo "❌ Ingestor service is not running (port 3002)"
fi

# Check Agent service
if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Agent service is running (port 3003)"
else
    echo "❌ Agent service is not running (port 3003)"
fi

# Start specified service
if [ "$1" = "api" ]; then
    echo ""
    echo "🚀 Starting API service..."
    cd apps/api && pnpm run start:dev
elif [ "$1" = "ingestor" ]; then
    echo ""
    echo "🚀 Starting Ingestor service..."
    cd apps/ingestor && pnpm run start:dev
elif [ "$1" = "agent" ]; then
    echo ""
    echo "🚀 Starting Agent service..."
    cd apps/agent && pnpm run start:dev
elif [ "$1" = "test" ]; then
    echo ""
    echo "🧪 Testing MVP 2 functionality..."
    echo "1. Testing health check..."
    curl -s http://localhost:3002/api/v1/health | jq . 2>/dev/null || echo "Health check failed"
    
    echo ""
    echo "2. Testing document processing..."
    curl -s -X POST http://localhost:3002/api/v1/knowledge/documents \
        -H "Content-Type: application/json" \
        -d '{"content":"This is a test document for validating document processing functionality.","source":"test","title":"Test Document"}' | jq . 2>/dev/null || echo "Document processing test failed"
    
    echo ""
    echo "3. Testing knowledge base statistics..."
    curl -s http://localhost:3002/api/v1/knowledge/stats | jq . 2>/dev/null || echo "Knowledge base statistics test failed"
elif [ "$1" = "test-mvp3" ]; then
    echo ""
    echo "🧪 Testing MVP 3 functionality..."
    echo "1. Testing Agent health check..."
    curl -s http://localhost:3003/health | jq . 2>/dev/null || echo "Agent health check failed"
    
    echo ""
    echo "2. Testing knowledge base connection..."
    curl -s http://localhost:3003/api/v1/knowledge/validate | jq . 2>/dev/null || echo "Knowledge base connection test failed"
    
    echo ""
    echo "3. Testing workflow execution..."
    curl -s -X POST http://localhost:3003/api/v1/workflow/execute \
        -H "Content-Type: application/json" \
        -d '{"eventId":"test_001","eventData":{"title":"Test Incident","severity":"medium"}}' | jq . 2>/dev/null || echo "Workflow execution test failed"
else
    echo ""
    echo "📋 Available startup options:"
    echo "  ./start-dev.sh api      - Start API service"
    echo "  ./start-dev.sh ingestor - Start Ingestor service"
    echo "  ./start-dev.sh test     - Test MVP 2 functionality"
    echo ""
    echo "📊 Current project status:"
    echo "  ✅ MVP 1: Completed (100%)"
    echo "  ✅ MVP 2: Completed (100%)"
    echo "  ✅ MVP 3: Architecture completed (100%) - Configuration and testing needed"
    echo ""
    echo "🎯 Next steps:"
    echo "  1. Start Agent service: ./start-dev.sh agent"
    echo "  2. Test MVP 3 functionality: ./start-dev.sh test-mvp3"
    echo "  3. Configure OpenAI API key and Qdrant connection"
fi
