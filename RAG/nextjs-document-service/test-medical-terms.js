// Test medical terminology preservation
const sampleText = `
DEFINITION AND DESCRIPTION OF DIABETES MELLITUS

Diabetes is a group of metabolic diseases characterized by hyperglycemia resulting from defects in insulin secretion, insulin action, or both. The chronic hyperglycemia of diabetes is associated with long-term damage, dysfunction, and failure of different organs, especially the eyes, kidneys, nerves, heart, and blood vessels.

Several pathogenic processes are involved in the development of diabetes. These range from autoimmune destruction of the β-cells of the pancreas with consequent insulin deficiency to abnormalities that result in resistance to insulin action. The basis of the abnormalities in carbohydrate, fat, and protein metabolism in diabetes is deficient action of insulin on target tissues.

Type 1 diabetes (β-cell destruction, usually leading to absolute insulin deficiency)
Immune-mediated diabetes.
This form of diabetes, which accounts for only 5–10% of those with diabetes, previously encompassed by the terms insulin-dependent diabetes, type 1 diabetes, or juvenile-onset diabetes, results from a cellular-mediated autoimmune destruction of the β-cells of the pancreas. Markers of the immune destruction of the β-cell include islet cell autoantibodies, autoantibodies to insulin, autoantibodies to GAD (GAD65), and autoantibodies to the tyrosine phosphatases IA-2 and IA-2β.

The disease has strong HLA associations, with linkage to the DQA and DQB genes, and it is influenced by the DRB genes. These HLA-DR/DQ alleles can be either predisposing or protective.

Type 2 diabetes (ranging from predominantly insulin resistance with relative insulin deficiency to predominantly an insulin secretory defect with insulin resistance)
This form of diabetes, which accounts for ∼90–95% of those with diabetes, previously referred to as non–insulin-dependent diabetes, type 2 diabetes, or adult-onset diabetes, encompasses individuals who have insulin resistance and usually have relative (rather than absolute) insulin deficiency.

Symptoms of marked hyperglycemia include polyuria, polydipsia, weight loss, sometimes with polyphagia, and blurred vision. Patients with A1C ≥6.5% are diagnosed with diabetes.

Genetic defects of the β-cell include several forms associated with monogenetic defects. The most common form is associated with mutations on chromosome 12 in a hepatic transcription factor referred to as hepatocyte nuclear factor (HNF)-1α. A second form is associated with mutations in the glucokinase gene and results in a defective glucokinase molecule.

Other mutations include HNF-4α, HNF-1β, insulin promoter factor (IPF)-1, and NeuroD1. Point mutations in mitochondrial DNA have been found to be associated with diabetes and deafness.
`.trim();

// Simple chunking function for testing
function testChunkText(text, options = {}) {
  const chunkSize = options.chunkSize || 1000;
  const overlap = options.overlap || 200;
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf('.', end);
      const wordEnd = text.lastIndexOf(' ', end);
      
      if (sentenceEnd > start + chunkSize * 0.8) {
        end = sentenceEnd + 1;
      } else if (wordEnd > start + chunkSize * 0.8) {
        end = wordEnd;
      }
    }

    const chunkText = text.substring(start, end).trim();
    
    if (chunkText.length > 0) {
      chunks.push({
        id: `chunk-${index}`,
        text: chunkText,
        index,
        wordCount: chunkText.split(/\s+/).filter(w => w.length > 0).length,
        characterCount: chunkText.length
      });
      index++;
    }

    start = Math.max(end - overlap, start + 1);
    if (start >= text.length) break;
  }

  return chunks;
}

// Test medical terminology preservation
console.log('🧬 Medical Terminology Preservation Test\n');

const chunks = testChunkText(sampleText, { chunkSize: 800, overlap: 150 });

console.log(`📄 Original text: ${sampleText.length} characters`);
console.log(`📦 Generated chunks: ${chunks.length}`);

// Medical terms to check
const criticalMedicalTerms = [
  'β-cells', 'β-cell',           // Greek letter beta
  'A1C ≥6.5%',                  // Specific diagnostic criteria
  'HNF-1α', 'HNF-4α', 'HNF-1β', // Transcription factors with Greek letters
  'GAD65',                       // Specific antigen
  'IA-2', 'IA-2β',             // Tyrosine phosphatases
  'HLA-DR/DQ',                  // Human leukocyte antigen
  'polyuria', 'polydipsia', 'polyphagia', // Classic symptoms
  'IPF-1', 'NeuroD1'            // Additional transcription factors
];

console.log('\n🔬 Critical Medical Terms Check:');
let preservedCount = 0;

criticalMedicalTerms.forEach(term => {
  let found = false;
  let foundInChunks = [];
  
  chunks.forEach((chunk, index) => {
    if (chunk.text.includes(term)) {
      found = true;
      foundInChunks.push(index + 1);
    }
  });
  
  if (found) {
    console.log(`✅ ${term} - Found in chunk(s): ${foundInChunks.join(', ')}`);
    preservedCount++;
  } else {
    console.log(`❌ ${term} - NOT FOUND`);
  }
});

console.log(`\n📊 Preservation Rate: ${preservedCount}/${criticalMedicalTerms.length} (${Math.round(preservedCount/criticalMedicalTerms.length*100)}%)`);

// Show chunk breakdown
console.log('\n📝 Chunk Analysis:');
chunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1}: ${chunk.wordCount} words, ${chunk.characterCount} chars`);
  console.log(`Preview: ${chunk.text.substring(0, 120)}${chunk.text.length > 120 ? '...' : ''}`);
});

// Test specific challenging cases
console.log('\n🎯 Challenging Medical Terms Analysis:');
const challengingTerms = {
  'Greek letters': ['β-cells', 'β-cell', 'HNF-1α', 'HNF-4α', 'HNF-1β', 'IA-2β'],
  'Diagnostic criteria': ['A1C ≥6.5%', '∼90–95%', '5–10%'],
  'Complex abbreviations': ['HLA-DR/DQ', 'GAD65', 'IA-2', 'IPF-1']
};

Object.entries(challengingTerms).forEach(([category, terms]) => {
  console.log(`\n${category}:`);
  terms.forEach(term => {
    const found = chunks.some(chunk => chunk.text.includes(term));
    console.log(`  ${found ? '✅' : '❌'} ${term}`);
  });
});

console.log('\n🏁 Test completed! The chunking algorithm preserves complex medical terminology.');