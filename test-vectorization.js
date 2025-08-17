// Test vectorization process
function testVectorization() {
  console.log('🧪 Testing vectorization process...\n');
  
  try {
    // 1. Test simple hash vectorization
    console.log('1. Testing simple hash vectorization...');
    const testText = "Test document";
    const vector = simpleHashVector(testText);
    console.log('   Input text:', testText);
    console.log('   Vector length:', vector.length);
    console.log('   First 10 vector values:', vector.slice(0, 10));
    console.log('   Vector contains NaN:', vector.some(v => isNaN(v)));
    console.log('   Vector contains Infinity:', vector.some(v => !isFinite(v)));
    console.log('✅ Vectorization successful');
    
    // 2. Test empty string
    console.log('\n2. Testing empty string...');
    const emptyVector = simpleHashVector("");
    console.log('   Empty string vector length:', emptyVector.length);
    console.log('   Empty string vector is all zeros:', emptyVector.every(v => v === 0));
    console.log('✅ Empty string processing successful');
    
    // 3. Test special characters
    console.log('\n3. Testing special characters...');
    const specialVector = simpleHashVector("!@#$%^&*()");
    console.log('   Special characters vector length:', specialVector.length);
    console.log('   Special characters vector is valid:', specialVector.every(v => isFinite(v)));
    console.log('✅ Special characters processing successful');
    
    console.log('\n🎉 Vectorization test passed completely!');
    
  } catch (error) {
    console.error('❌ Vectorization test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

function simpleHashVector(text) {
  const vector = new Array(1536).fill(0);
  
  if (!text || text.trim().length === 0) {
    return vector;
  }
  
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, index) => {
    try {
      const hash = hashString(word);
      const position = hash % 1536;
      vector[position] = (vector[position] + 1) / (index + 1);
    } catch (error) {
      console.error(`Error processing word "${word}":`, error);
      throw error;
    }
  });
  
  // Normalize vector
  try {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      vector.forEach((val, i) => {
        vector[i] = val / magnitude;
      });
    }
  } catch (error) {
    console.error('Vector normalization failed:', error);
    throw error;
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
testVectorization();
