import OpenAI from 'openai';
import { openaiConfig } from './config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
});

// OpenAI Embeddings Configuration from centralized config
const EMBEDDING_MODEL = openaiConfig.embeddingModel;
const EMBEDDING_DIMENSIONS = openaiConfig.embeddingDimensions;
const MAX_BATCH_SIZE = openaiConfig.maxBatchSize;

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding for a single text chunk
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    if (!openaiConfig.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    // Clean and prepare text
    const cleanText = text.replace(/\n/g, ' ').trim();
    
    // Generate embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    return {
      embedding: response.data[0].embedding,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      }
    };
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.status === 400) {
      throw new Error('Invalid input text for embedding');
    }
    
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple text chunks (batch processing)
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  try {
    if (!openaiConfig.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (texts.length === 0) {
      throw new Error('No texts provided');
    }

    if (texts.length > MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${texts.length} exceeds maximum ${MAX_BATCH_SIZE}`);
    }

    // Clean and prepare texts
    const cleanTexts = texts.map(text => text.replace(/\n/g, ' ').trim()).filter(text => text.length > 0);
    
    if (cleanTexts.length === 0) {
      throw new Error('No valid texts after cleaning');
    }

    // Generate embeddings
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: cleanTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    if (!response.data || response.data.length !== cleanTexts.length) {
      throw new Error('Mismatch between input texts and returned embeddings');
    }

    return {
      embeddings: response.data.map(item => item.embedding),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      }
    };
  } catch (error: any) {
    console.error('Error generating batch embeddings:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded');
    } else if (error.status === 400) {
      throw new Error('Invalid input texts for embedding');
    }
    
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Process large batches by splitting into smaller chunks
 */
export async function generateLargeBatchEmbeddings(
  texts: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<BatchEmbeddingResult> {
  const allEmbeddings: number[][] = [];
  const totalUsage = { prompt_tokens: 0, total_tokens: 0 };
  
  // Process in chunks
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    
    try {
      const result = await generateBatchEmbeddings(batch);
      allEmbeddings.push(...result.embeddings);
      totalUsage.prompt_tokens += result.usage.prompt_tokens;
      totalUsage.total_tokens += result.usage.total_tokens;
      
      // Progress callback
      if (onProgress) {
        onProgress(i + batch.length, texts.length);
      }
      
      // Add delay between batches to respect rate limits
      if (i + MAX_BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    } catch (error) {
      console.error(`Error processing batch ${i}-${i + batch.length}:`, error);
      throw error;
    }
  }
  
  return {
    embeddings: allEmbeddings,
    usage: totalUsage
  };
}

/**
 * Generate embedding for search queries
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const result = await generateEmbedding(query);
  return result.embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Estimate embedding cost
 */
export function estimateEmbeddingCost(textCount: number, averageTokensPerText: number = 100): {
  estimatedTokens: number;
  estimatedCostUSD: number;
} {
  const estimatedTokens = textCount * averageTokensPerText;
  const costPerToken = 0.00000002; // $0.02 per 1M tokens for text-embedding-3-small
  const estimatedCostUSD = estimatedTokens * costPerToken;
  
  return {
    estimatedTokens,
    estimatedCostUSD: Math.round(estimatedCostUSD * 10000) / 10000 // Round to 4 decimal places
  };
}

/**
 * Test OpenAI API connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const testResult = await generateEmbedding('test');
    return testResult.embedding.length === EMBEDDING_DIMENSIONS;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, MAX_BATCH_SIZE };