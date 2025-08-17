const axios = require('axios');

// View knowledge base content
async function viewKnowledgeContent() {
  try {
    console.log('📚 Viewing knowledge base content...\n');
    
    // Get knowledge base statistics
    const statsResponse = await axios.get('http://localhost:6333/collections/opsai-knowledge');
    
    if (statsResponse.data.status === 'ok') {
      const collection = statsResponse.data.result;
      console.log(`📊 Collection status: ${collection.status}`);
      console.log(`🔢 Total points: ${collection.points_count}`);
      console.log(`📈 Indexed vectors: ${collection.indexed_vectors_count}\n`);
      
      // Get all data points
      const pointsResponse = await axios.get('http://localhost:6333/collections/opsai-knowledge/points?limit=20');
      
      if (pointsResponse.data.status === 'ok') {
        const points = pointsResponse.data.result.points;
        console.log(`📖 Knowledge base entries (Total: ${points.length}):\n`);
        
        points.forEach((point, index) => {
          const payload = point.payload;
          console.log(`${index + 1}. 📋 ${payload.title}`);
          console.log(`   🏷️  Category: ${payload.category}`);
          console.log(`   ⚠️  Severity: ${payload.severity}`);
          console.log(`   🏷️  Tags: ${payload.tags.join(', ')}`);
          console.log(`   📅  Created: ${payload.created_at}`);
          console.log(`   📝  Content preview: ${payload.content.substring(0, 100)}...`);
          console.log('');
        });
        
        // Statistics by category
        const categories = {};
        points.forEach(point => {
          const category = point.payload.category;
          categories[category] = (categories[category] || 0) + 1;
        });
        
        console.log('📊 Statistics by category:');
        Object.entries(categories).forEach(([category, count]) => {
          console.log(`   ${category}: ${count} entries`);
        });
        
      } else {
        console.log('❌ Failed to get data points');
      }
      
    } else {
      console.log('❌ Failed to get collection information');
    }
    
  } catch (error) {
    console.error('❌ Error viewing knowledge base:', error.message);
  }
}

// Run script
if (require.main === module) {
  viewKnowledgeContent();
}

module.exports = { viewKnowledgeContent };
