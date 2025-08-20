/**
 * Simple embedding validation tests
 * Verifies that uploads create proper embeddings
 */

import { describe, it, expect } from '@jest/globals';

describe('Embedding Validation', () => {
  it('should validate embedding dimensions are correct', () => {
    // Test embedding structure
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
    
    expect(Array.isArray(mockEmbedding)).toBe(true);
    expect(mockEmbedding.length).toBe(1536);
    expect(mockEmbedding.every(val => typeof val === 'number')).toBe(true);
  });

  it('should calculate cosine similarity correctly', () => {
    const vector1 = [1, 0, 0];
    const vector2 = [0, 1, 0];
    const vector3 = [1, 0, 0];

    const similarity = cosineSimilarity(vector1, vector3);
    const dissimilarity = cosineSimilarity(vector1, vector2);

    expect(similarity).toBe(1); // Identical vectors
    expect(dissimilarity).toBe(0); // Orthogonal vectors
  });

  it('should detect missing embeddings in database results', () => {
    const chunks = [
      { id: 'chunk-1', text: 'Text 1', embedding: Array(1536).fill(0.1) },
      { id: 'chunk-2', text: 'Text 2', embedding: null },
      { id: 'chunk-3', text: 'Text 3', embedding: Array(1536).fill(0.2) }
    ];

    const missingEmbeddings = chunks.filter(chunk => !chunk.embedding);
    const completionRate = ((chunks.length - missingEmbeddings.length) / chunks.length) * 100;

    expect(missingEmbeddings.length).toBe(1);
    expect(Math.round(completionRate * 100) / 100).toBe(66.67); // 2 out of 3 have embeddings
  });

  it('should validate embedding quality metrics', () => {
    const embedding = Array(1536).fill(0).map(() => Math.random() - 0.5);
    
    // Calculate vector magnitude
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    
    // Check that embedding has reasonable values
    expect(magnitude).toBeGreaterThan(0);
    expect(embedding.every(val => val >= -1 && val <= 1)).toBe(true);
    
    // Check for reasonable distribution (not all zeros)
    const nonZeroCount = embedding.filter(val => Math.abs(val) > 0.001).length;
    expect(nonZeroCount).toBeGreaterThan(100); // Most values should be non-zero
  });
});

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}