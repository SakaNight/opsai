const axios = require('axios');

const AGENT_URL = 'http://localhost:3003';

async function testAgentService() {
  console.log('🧪 Testing OpsAI Agent Service...\n');

  try {
    // 1. 测试健康检查
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${AGENT_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // 2. 测试服务信息
    console.log('2️⃣ Testing service info...');
    const infoResponse = await axios.get(`${AGENT_URL}/`);
    console.log('✅ Service info retrieved:', infoResponse.data.service);
    console.log('');

    // 3. 测试知识库连接验证
    console.log('3️⃣ Testing knowledge base connection...');
    const knowledgeResponse = await axios.get(`${AGENT_URL}/api/v1/knowledge/validate`);
    console.log('✅ Knowledge validation:', knowledgeResponse.data);
    console.log('');

    // 4. 测试知识库统计
    console.log('4️⃣ Testing knowledge stats...');
    const statsResponse = await axios.get(`${AGENT_URL}/api/v1/knowledge/stats`);
    console.log('✅ Knowledge stats:', statsResponse.data);
    console.log('');

    // 5. 测试知识搜索
    console.log('5️⃣ Testing knowledge search...');
    const searchResponse = await axios.post(`${AGENT_URL}/api/v1/knowledge/search`, {
      query: 'database connection timeout',
      filters: { service: 'database' },
      limit: 5
    });
    console.log('✅ Knowledge search:', searchResponse.data);
    console.log('');

    // 6. 测试工作流执行（模拟）
    console.log('6️⃣ Testing workflow execution...');
    const workflowResponse = await axios.post(`${AGENT_URL}/api/v1/workflow/execute`, {
      eventId: 'test_incident_001',
      eventData: {
        title: 'Database connection timeout',
        severity: 'high',
        service: 'database',
        description: 'Users experiencing slow response times due to database connection issues'
      }
    });
    console.log('✅ Workflow execution:', workflowResponse.data);
    console.log('');

    console.log('🎉 All tests passed! Agent service is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// 检查服务是否启动
async function waitForService() {
  console.log('⏳ Waiting for Agent service to start...');
  
  for (let i = 0; i < 30; i++) {
    try {
      await axios.get(`${AGENT_URL}/health`);
      console.log('✅ Service is ready!');
      return true;
    } catch (error) {
      if (i === 29) {
        console.error('❌ Service failed to start within 30 seconds');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      process.stdout.write('.');
    }
  }
  return false;
}

// 主函数
async function main() {
  const serviceReady = await waitForService();
  
  if (serviceReady) {
    await testAgentService();
  } else {
    console.error('❌ Cannot proceed with tests - service not available');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAgentService, waitForService };
