const axios = require('axios');

// Test knowledge base search functionality
async function testKnowledgeSearch() {
  const baseUrl = 'http://localhost:3003';
  
  try {
    console.log('🧪 Testing knowledge base search functionality...\n');
    
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   - Agent: ${healthResponse.data.services.agent}`);
    console.log(`   - Knowledge: ${healthResponse.data.services.knowledge}\n`);
    
    // Test 2: Knowledge base connection validation
    console.log('2️⃣ Testing knowledge base connection...');
    const validateResponse = await axios.get(`${baseUrl}/api/v1/knowledge/validate`);
    console.log(`✅ Connection status: ${validateResponse.data.data.connected ? 'Success' : 'Failed'}`);
    console.log(`   - Message: ${validateResponse.data.message}\n`);
    
    // Test 3: Knowledge base statistics
    console.log('3️⃣ Testing knowledge base statistics...');
    const statsResponse = await axios.get(`${baseUrl}/api/v1/knowledge/stats`);
    console.log(`✅ Statistics: ${statsResponse.data.message}`);
    if (statsResponse.data.data.error) {
      console.log(`   - Error: ${statsResponse.data.data.error}`);
    }
    console.log('');
    
    // Test 4: Knowledge base search
    console.log('4️⃣ Testing knowledge base search...');
    const searchQueries = [
      'database connection timeout',
      'kubernetes pod troubleshooting',
      'redis memory optimization',
      'docker monitoring',
      'mongodb performance'
    ];
    
    for (const query of searchQueries) {
              console.log(`🔍 Searching: "${query}"`);
      try {
        const searchResponse = await axios.post(`${baseUrl}/api/v1/knowledge/search`, {
          query: query,
          limit: 2
        });
        
        if (searchResponse.data.success) {
          const results = searchResponse.data.data.results;
          console.log(`   ✅ Found ${results.length} results`);
          
          if (results.length > 0) {
            results.forEach((result, index) => {
              console.log(`     ${index + 1}. ${result.title} (Relevance: ${result.relevance.toFixed(3)})`);
            });
          }
        } else {
          console.log(`   ❌ Search failed: ${searchResponse.data.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Search error: ${error.message}`);
      }
      console.log('');
    }
    
    // Test 5: Direct Qdrant query
    console.log('5️⃣ Directly querying Qdrant collection...');
    try {
      const qdrantResponse = await axios.get('http://localhost:6333/collections/opsai-knowledge');
      if (qdrantResponse.data.status === 'ok') {
        const collection = qdrantResponse.data.result;
        console.log(`✅ Qdrant collection status: ${collection.status}`);
        console.log(`   - Total points: ${collection.points_count}`);
        console.log(`   - Indexed vectors: ${collection.indexed_vectors_count}`);
        console.log(`   - Segments: ${collection.segments_count}`);
      }
    } catch (error) {
      console.log(`❌ Qdrant query failed: ${error.message}`);
    }
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run test
if (require.main === module) {
  testKnowledgeSearch();
}

module.exports = { testKnowledgeSearch };
