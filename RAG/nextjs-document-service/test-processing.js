// Simple test script to verify document processing
const fs = require('fs');
const path = require('path');

// Test text processing function
function basicChunkText(text, options = {}) {
  const { chunkSize = 1000, overlap = 200 } = options;
  const chunks = [];
  
  let start = 0;
  let index = 0;
  
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    // Find sentence boundary if not at end
    if (end < text.length) {
      let lastSentence = text.lastIndexOf('.', end);
      let lastNewline = text.lastIndexOf('\n', end);
      let boundary = Math.max(lastSentence, lastNewline);
      
      if (boundary > start) {
        end = boundary + 1;
      }
    }
    
    const chunkText = text.substring(start, end).trim();
    if (chunkText) {
      chunks.push({
        id: `chunk-${index}`,
        text: chunkText,
        index,
        wordCount: chunkText.split(/\s+/).length,
        characterCount: chunkText.length
      });
      index++;
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

// Test with sample text
const testText = `
Type 2 diabetes is a chronic metabolic disorder characterized by high blood glucose levels (A1C ≥6.5%).

The condition affects how your body uses glucose and involves insulin resistance. When you have type 2 diabetes, your pancreatic β-cells don't produce enough insulin or your body doesn't use insulin effectively.

Common symptoms include increased thirst, frequent urination, and fatigue. Risk factors include obesity, family history, and sedentary lifestyle.

Treatment often involves lifestyle modifications, oral medications, and sometimes insulin therapy.
`.trim();

console.log('=== Next.js Document Processing Service Test ===\n');
console.log('Original text length:', testText.length);

const chunks = basicChunkText(testText, { chunkSize: 150, overlap: 30 });

console.log('Number of chunks:', chunks.length);
console.log('\n=== Chunks ===');

chunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1} (${chunk.wordCount} words, ${chunk.characterCount} chars):`);
  console.log(chunk.text);
  console.log('---');
});

// Test with diabetes.md if it exists
const diabetesPath = '../data/diabetes.md';
if (fs.existsSync(diabetesPath)) {
  console.log('\n=== Testing with diabetes.md ===');
  const diabetesContent = fs.readFileSync(diabetesPath, 'utf8');
  const diabetesChunks = basicChunkText(diabetesContent, { chunkSize: 1000, overlap: 200 });
  
  console.log('Diabetes.md length:', diabetesContent.length);
  console.log('Diabetes.md chunks:', diabetesChunks.length);
  console.log('First chunk preview:', diabetesChunks[0]?.text.substring(0, 200) + '...');
} else {
  console.log('\ndiabetes.md not found at:', diabetesPath);
}

console.log('\n✅ Basic processing test completed!');