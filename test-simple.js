// Simple document processing test
function testDocumentProcessing() {
  console.log('🧪 Testing document processing logic...\n');
  
  // Simulate DocumentProcessorService logic
  const content = "Test document";
  const metadata = {
    source: "test",
    title: "Simple test"
  };
  
  console.log('1. Input data:');
  console.log('   content:', content);
  console.log('   metadata:', metadata);
  
  // Test text chunking
  console.log('\n2. Text chunking test:');
  const chunks = chunkText(content, metadata);
      console.log('   Chunking result:', chunks);
  
  // Test vectorization
  console.log('\n3. Vectorization test:');
  const vectors = vectorizeChunks(chunks);
      console.log('   Vectorization result:', vectors);
  
      console.log('\n✅ Basic logic test completed');
}

function chunkText(content, metadata) {
  const chunks = [];
  
  // If content is empty or too short, create a single chunk
  if (!content || content.trim().length === 0) {
    chunks.push(createChunk('', 0, metadata));
    chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
    return chunks;
  }
  
  // If content length is less than default chunk size, create a single chunk
  if (content.length <= 1000) {
    chunks.push(createChunk(content, 0, metadata));
    chunks.forEach(chunk => chunk.metadata.totalChunks = 1);
    return chunks;
  }
  
  return chunks;
}

function createChunk(content, chunkIndex, metadata) {
  return {
    id: `${metadata.source}-${Date.now()}-${chunkIndex}`,
    content: content.trim(),
    metadata: {
      ...metadata,
      chunkIndex,
      totalChunks: 0,
      timestamp: new Date(),
    },
  };
}

function vectorizeChunks(chunks) {
  return chunks.map(chunk => ({
    id: chunk.id,
    vector: simpleHashVector(chunk.content),
    payload: {
      content: chunk.content,
      ...chunk.metadata,
    },
  }));
}

function simpleHashVector(text) {
  const vector = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, index) => {
    const hash = hashString(word);
    const position = hash % 1536;
    vector[position] = (vector[position] + 1) / (index + 1);
  });
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    vector.forEach((val, i) => {
      vector[i] = val / magnitude;
    });
  }
  
  return vector;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Run test
testDocumentProcessing();
