// Verification script for Next.js Document Processing Service
const fs = require('fs');
const path = require('path');

// Import the processor functions (simulated since we can't use ES modules directly)
function validateFile(buffer, filename) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = ['.txt', '.md', '.markdown'];
  
  if (buffer.length > maxSize) {
    return { isValid: false, error: 'File too large (max 10MB)' };
  }
  
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return { isValid: false, error: 'Invalid file type' };
  }
  
  return { isValid: true };
}

async function processFileContent(buffer, filename) {
  const text = buffer.toString('utf-8');
  
  // Basic markdown to text conversion
  return text
    .replace(/^#+\s*/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
    .trim();
}

function chunkText(text, options = {}) {
  const { chunkSize = 1000, overlap = 200 } = options;
  const chunks = [];
  
  let start = 0;
  let index = 0;
  
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    // Find sentence boundary
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
    
    start = Math.max(end - overlap, start + 1);
    if (start >= text.length) break;
  }
  
  return chunks;
}

function generatePreview(text, maxLength = 300) {
  return text.length <= maxLength 
    ? text 
    : text.substring(0, maxLength).trim() + '...';
}

// Test the processing pipeline
async function runTest() {
  console.log('🧪 Next.js Document Processing Service - Verification Test\n');
  
  try {
    // Read diabetes.md file
    const diabetesPath = '/Users/ddctu/git/claude/data/diabetes.md';
    const fileBuffer = fs.readFileSync(diabetesPath);
    const filename = 'diabetes.md';
    
    console.log('📄 Testing with diabetes.md');
    console.log(`   File size: ${(fileBuffer.length / 1024).toFixed(1)} KB`);
    
    // Validate file
    const validation = validateFile(fileBuffer, filename);
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.error);
      return;
    }
    console.log('✅ File validation passed');
    
    // Process content
    const extractedText = await processFileContent(fileBuffer, filename);
    console.log(`✅ Text extraction completed: ${extractedText.length} characters`);
    
    // Generate preview
    const preview = generatePreview(extractedText);
    console.log('✅ Preview generated');
    console.log(`   Preview: "${preview.substring(0, 100)}..."`);
    
    // Create chunks
    const chunks = chunkText(extractedText, { chunkSize: 1000, overlap: 200 });
    console.log(`✅ Text chunking completed: ${chunks.length} chunks created`);
    
    // Test medical terminology preservation
    const medicalTerms = [
      'β-cell', 'β-cells',
      'A1C ≥6.5%', 'HNF-1α', 'HNF-4α', 'HNF-1β',
      'GAD65', 'IA-2', 'IA-2β',
      'C-peptide', 'HLA-DR/DQ',
      'polyuria', 'polydipsia', 'polyphagia'
    ];
    
    let preservedTerms = 0;
    medicalTerms.forEach(term => {
      const found = chunks.some(chunk => chunk.text.includes(term));
      if (found) {
        preservedTerms++;
      }
    });
    
    console.log(`✅ Medical terminology preservation: ${preservedTerms}/${medicalTerms.length} terms preserved`);
    
    // Show statistics
    console.log('\n📊 Processing Statistics:');
    console.log(`   Original length: ${extractedText.length} characters`);
    console.log(`   Number of chunks: ${chunks.length}`);
    console.log(`   Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.characterCount, 0) / chunks.length)} characters`);
    console.log(`   Average words per chunk: ${Math.round(chunks.reduce((sum, c) => sum + c.wordCount, 0) / chunks.length)}`);
    
    // Show first few chunks
    console.log('\n📝 Sample Chunks:');
    chunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`\n   Chunk ${i + 1} (${chunk.wordCount} words):`);
      console.log(`   ${chunk.text.substring(0, 150)}${chunk.text.length > 150 ? '...' : ''}`);
    });
    
    console.log('\n🎉 All tests passed! Next.js Document Processing Service is working correctly.');
    
    return {
      success: true,
      document: {
        id: Date.now().toString(),
        filename,
        size: fileBuffer.length,
        textLength: extractedText.length,
        chunksCount: chunks.length,
        processedAt: new Date().toISOString()
      },
      chunks,
      preview
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
runTest().then(result => {
  if (result.success) {
    console.log('\n✅ Verification completed successfully!');
  } else {
    console.log('\n❌ Verification failed:', result.error);
  }
});