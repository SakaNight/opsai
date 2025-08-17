#!/bin/bash

# OpsAI 开发启动脚本
# 使用方法: ./start-dev.sh [service]

echo "🚀 OpsAI 开发环境启动脚本"
echo "================================"

# 检查是否在项目根目录
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    echo "当前目录: $(pwd)"
    echo "请执行: cd /Users/arieschan/Desktop/Work/Project/opsai"
    exit 1
fi

echo "✅ 项目根目录确认: $(pwd)"

# 检查基础设施状态
echo ""
echo "🔍 检查基础设施状态..."
if docker compose -f infra/local/docker-compose.yaml ps | grep -q "Up"; then
    echo "✅ Docker 基础设施正在运行"
else
    echo "⚠️  Docker 基础设施未运行，正在启动..."
    docker compose -f infra/local/docker-compose.yaml up -d
    echo "⏳ 等待基础设施启动..."
    sleep 10
fi

# 检查服务状态
echo ""
echo "🔍 检查服务状态..."

# 检查 API 服务
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API 服务运行中 (端口 3000)"
else
    echo "❌ API 服务未运行 (端口 3000)"
fi

# 检查 Ingestor 服务
if curl -s http://localhost:3002/api/v1/health > /dev/null 2>&1; then
    echo "✅ Ingestor 服务运行中 (端口 3002)"
else
    echo "❌ Ingestor 服务未运行 (端口 3002)"
fi

# 检查 Agent 服务
if curl -s http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Agent 服务运行中 (端口 3003)"
else
    echo "❌ Agent 服务未运行 (端口 3003)"
fi

# 启动指定服务
if [ "$1" = "api" ]; then
    echo ""
    echo "🚀 启动 API 服务..."
    cd apps/api && pnpm run start:dev
elif [ "$1" = "ingestor" ]; then
    echo ""
    echo "🚀 启动 Ingestor 服务..."
    cd apps/ingestor && pnpm run start:dev
elif [ "$1" = "agent" ]; then
    echo ""
    echo "🚀 启动 Agent 服务..."
    cd apps/agent && pnpm run start:dev
elif [ "$1" = "test" ]; then
    echo ""
    echo "🧪 测试 MVP 2 功能..."
    echo "1. 测试健康检查..."
    curl -s http://localhost:3002/api/v1/health | jq . 2>/dev/null || echo "健康检查失败"
    
    echo ""
    echo "2. 测试文档处理..."
    curl -s -X POST http://localhost:3002/api/v1/knowledge/documents \
        -H "Content-Type: application/json" \
        -d '{"content":"这是一个测试文档，用于验证文档处理功能。","source":"test","title":"测试文档"}' | jq . 2>/dev/null || echo "文档处理测试失败"
    
    echo ""
    echo "3. 测试知识库统计..."
    curl -s http://localhost:3002/api/v1/knowledge/stats | jq . 2>/dev/null || echo "知识库统计测试失败"
elif [ "$1" = "test-mvp3" ]; then
    echo ""
    echo "🧪 测试 MVP 3 功能..."
    echo "1. 测试 Agent 健康检查..."
    curl -s http://localhost:3003/health | jq . 2>/dev/null || echo "Agent 健康检查失败"
    
    echo ""
    echo "2. 测试知识库连接..."
    curl -s http://localhost:3003/api/v1/knowledge/validate | jq . 2>/dev/null || echo "知识库连接测试失败"
    
    echo ""
    echo "3. 测试工作流执行..."
    curl -s -X POST http://localhost:3003/api/v1/workflow/execute \
        -H "Content-Type: application/json" \
        -d '{"eventId":"test_001","eventData":{"title":"Test Incident","severity":"medium"}}' | jq . 2>/dev/null || echo "工作流执行测试失败"
else
    echo ""
    echo "📋 可用的启动选项:"
    echo "  ./start-dev.sh api      - 启动 API 服务"
    echo "  ./start-dev.sh ingestor - 启动 Ingestor 服务"
    echo "  ./start-dev.sh test     - 测试 MVP 2 功能"
    echo ""
    echo "📊 当前项目状态:"
    echo "  ✅ MVP 1: 已完成 (100%)"
    echo "  ✅ MVP 2: 已完成 (100%)"
    echo "  ✅ MVP 3: 架构完成 (100%) - 需要配置和测试"
    echo ""
    echo "🎯 下一步建议:"
    echo "  1. 启动 Agent 服务: ./start-dev.sh agent"
    echo "  2. 测试 MVP 3 功能: ./start-dev.sh test-mvp3"
    echo "  3. 配置 OpenAI API key 和 Qdrant 连接"
fi
