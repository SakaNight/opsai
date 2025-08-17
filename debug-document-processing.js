const axios = require('axios');

async function debugDocumentProcessing() {
  console.log('🔍 Debugging document processing errors...\n');
  
  try {
      // 1. Test health check
  console.log('1. Testing health check...');
    const healthResponse = await axios.get('http://localhost:3002/api/v1/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
      // 2. Test knowledge base statistics
  console.log('\n2. Testing knowledge base statistics...');
    const statsResponse = await axios.get('http://localhost:3002/api/v1/knowledge/stats');
    console.log('✅ Knowledge base statistics:', statsResponse.data);
    
      // 3. Test collections list
  console.log('\n3. Testing collections list...');
    const collectionsResponse = await axios.get('http://localhost:3002/api/v1/knowledge/collections');
    console.log('✅ Collections list:', collectionsResponse.data);
    
      // 4. Test document processing (simple document)
  console.log('\n4. Testing document processing (simple document)...');
    const simpleDocResponse = await axios.post('http://localhost:3002/api/v1/knowledge/documents', {
      content: 'Test',
      source: 'test',
      title: 'Simple test'
    });
    console.log('✅ Simple document processing successful:', simpleDocResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Complete error:', error);
  }
}

debugDocumentProcessing();
