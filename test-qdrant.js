const axios = require('axios');

async function testQdrantService() {
  console.log('🔍 Testing Qdrant service...\n');
  
  const baseUrl = 'http://localhost:6333';
  
  try {
      // 1. Test Qdrant health status
  console.log('1. Testing Qdrant health status...');
    const healthResponse = await axios.get(`${baseUrl}/`);
    console.log('✅ Qdrant service is healthy:', healthResponse.status);
    
      // 2. Test collections list
  console.log('\n2. Testing collections list...');
    const collectionsResponse = await axios.get(`${baseUrl}/collections`);
    console.log('✅ Collections list:', collectionsResponse.data.result.collections.map(c => c.name));
    
      // 3. Test opsai-knowledge collection status
  console.log('\n3. Testing opsai-knowledge collection status...');
    const collectionResponse = await axios.get(`${baseUrl}/collections/opsai-knowledge`);
    console.log('✅ Collection status:', collectionResponse.data.result.status);
    
      // 4. Test inserting vector points
  console.log('\n4. Testing inserting vector points...');
    const testPoint = {
      points: [{
        id: 'test-1',
        vector: new Array(1536).fill(0.1), // Simple test vector
        payload: {
          content: 'Test content',
          source: 'test',
          title: 'Test title'
        }
      }]
    };
    
    const insertResponse = await axios.put(`${baseUrl}/collections/opsai-knowledge/points`, testPoint);
    console.log('✅ Vector point inserted successfully:', insertResponse.status);
    
      // 5. Test search
  console.log('\n5. Testing vector search...');
    const searchPayload = {
      vector: new Array(1536).fill(0.1),
      limit: 1,
      score_threshold: 0.0,
      with_payload: true
    };
    
    const searchResponse = await axios.post(`${baseUrl}/collections/opsai-knowledge/points/search`, searchPayload);
    console.log('✅ Search successful:', searchResponse.data.result.length, 'results');
    
    console.log('\n🎉 Qdrant service test passed completely!');
    
  } catch (error) {
    console.error('❌ Qdrant service test failed:');
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testQdrantService();
