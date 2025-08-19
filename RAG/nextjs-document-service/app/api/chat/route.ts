import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';
import { generateEmbedding } from '../../../lib/embeddings';
import { generateChatResponse, validateChatRequest } from '../../../lib/openai-chat';

/**
 * Chat endpoint that combines RAG search with OpenAI question answering
 * POST /api/chat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateChatRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    const { question, userId, searchMode, maxResults, similarityThreshold } = validation.data!;
    
    console.log(`Chat request: "${question}" (mode: ${searchMode}, threshold: ${similarityThreshold})`);
    
    // Step 1: Perform RAG search to get relevant context
    const searchResults = await performRAGSearch({
      query: question,
      userId,
      searchMode: searchMode!,
      maxResults: maxResults!,
      similarityThreshold: similarityThreshold!
    });
    
    if (searchResults.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough relevant information in the knowledge base to answer your question. Please try rephrasing your question or upload more relevant documents.",
        sources: [],
        search_results_count: 0,
        tokens_used: 0,
        model_used: 'none'
      });
    }
    
    console.log(`Found ${searchResults.length} relevant chunks for chat`);
    
    // Step 2: Generate AI response using OpenAI with RAG context
    const chatResponse = await generateChatResponse({
      question,
      searchResults,
      userId
    });
    
    console.log(`Generated response using ${chatResponse.model_used}, tokens: ${chatResponse.tokens_used}`);
    
    return NextResponse.json(chatResponse);
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Handle specific OpenAI errors
    if (error.message?.includes('OpenAI API')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }
    
    // Handle database errors
    if (error.message?.includes('database')) {
      return NextResponse.json(
        { error: 'Search service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Perform RAG search based on specified mode
 */
async function performRAGSearch(params: {
  query: string;
  userId: string;
  searchMode: string;
  maxResults: number;
  similarityThreshold: number;
}) {
  const { query, userId, searchMode, maxResults, similarityThreshold } = params;
  
  console.log(`Performing ${searchMode} search for: "${query}"`);
  
  if (searchMode === 'semantic') {
    return await performSemanticSearch(query, userId, maxResults, similarityThreshold);
  } else if (searchMode === 'keyword') {
    return await performKeywordSearch(query, userId, maxResults);
  } else if (searchMode === 'hybrid') {
    return await performHybridSearch(query, userId, maxResults, similarityThreshold);
  } else if (searchMode === 'medical_tables') {
    return await performMedicalTableSearch(query, userId, maxResults);
  }
  
  throw new Error(`Unsupported search mode: ${searchMode}`);
}

/**
 * Perform semantic search using vector embeddings
 */
async function performSemanticSearch(query: string, userId: string, maxResults: number, threshold: number) {
  const embeddingResult = await generateEmbedding(query);
  const queryVector = `[${embeddingResult.embedding.join(',')}]`;
  
  console.log(`Generated embedding with ${embeddingResult.embedding.length} dimensions`);
  
  const searchQuery = `
    SELECT 
      c.id as chunk_id,
      c.text,
      c.chunk_index,
      d.filename as document_name,
      (c.embedding <=> $1::vector) as distance,
      (1 - (c.embedding <=> $1::vector)) as similarity_score
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE d.user_id = $2 
      AND d.status = 'completed'
      AND (1 - (c.embedding <=> $1::vector)) >= $3
    ORDER BY c.embedding <=> $1::vector
    LIMIT $4
  `;
  
  const result = await db.query(searchQuery, [queryVector, userId, threshold, maxResults]);
  
  console.log(`Semantic search found ${result.rows.length} results`);
  
  return result.rows.map((row: any) => ({
    chunk_id: row.chunk_id,
    text: row.text,
    chunk_index: row.chunk_index,
    document_name: row.document_name,
    similarity_score: parseFloat(row.similarity_score),
    page: calculatePageNumber(row.chunk_index) // Estimate page from chunk index
  }));
}

/**
 * Perform keyword search using PostgreSQL full-text search
 */
async function performKeywordSearch(query: string, userId: string, maxResults: number) {
  const keywords = extractKeywords(query);
  console.log(`Extracted keywords: ${keywords.join(', ')}`);
  
  const conditions = keywords.map(() => 'LOWER(c.text) LIKE LOWER(?)').join(' OR ');
  const keywordParams = keywords.map(kw => `%${kw}%`);
  
  const searchQuery = `
    SELECT 
      c.id as chunk_id,
      c.text,
      c.chunk_index,
      d.filename as document_name,
      0.8 as similarity_score
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE d.user_id = $1 
      AND d.status = 'completed'
      AND (${keywords.map((_, i) => `LOWER(c.text) ILIKE $${i + 3}`).join(' OR ')})
    ORDER BY 
      c.chunk_index ASC
    LIMIT $2
  `;
  
  const params = [userId, maxResults, ...keywordParams];
  const result = await db.query(searchQuery, params);
  
  console.log(`Keyword search found ${result.rows.length} results`);
  
  return result.rows.map((row: any) => ({
    chunk_id: row.chunk_id,
    text: row.text,
    chunk_index: row.chunk_index,
    document_name: row.document_name,
    similarity_score: parseFloat(row.similarity_score),
    page: calculatePageNumber(row.chunk_index)
  }));
}

/**
 * Perform hybrid search (combination of semantic and keyword)
 */
async function performHybridSearch(query: string, userId: string, maxResults: number, threshold: number) {
  console.log(`Performing hybrid search for: "${query}"`);
  
  // Get both semantic and keyword results
  const [semanticResults, keywordResults] = await Promise.all([
    performSemanticSearch(query, userId, maxResults, threshold),
    performKeywordSearch(query, userId, maxResults)
  ]);
  
  console.log(`Hybrid: ${semanticResults.length} semantic + ${keywordResults.length} keyword results`);
  
  // Determine weights based on semantic quality
  const avgSemanticScore = semanticResults.reduce((sum, r) => sum + (r.similarity_score || 0), 0) / semanticResults.length;
  const semanticWeight = avgSemanticScore > 0.5 ? 0.8 : 0.4;
  const keywordWeight = 1 - semanticWeight;
  
  console.log(`Hybrid weights - semantic: ${semanticWeight}, keyword: ${keywordWeight}`);
  
  // Combine and deduplicate results
  const combinedResults = new Map<string, any>();
  
  // Add semantic results with their weights
  semanticResults.forEach(result => {
    const key = String(result.chunk_id); // Ensure string key
    combinedResults.set(key, {
      ...result,
      final_score: (result.similarity_score || 0) * semanticWeight,
      source_type: 'semantic'
    });
  });
  
  // Add keyword results, updating score if already exists
  keywordResults.forEach(result => {
    const key = String(result.chunk_id); // Ensure string key
    if (combinedResults.has(key)) {
      const existing = combinedResults.get(key);
      existing.final_score += (result.similarity_score || 0) * keywordWeight;
      existing.source_type = 'hybrid'; // Mark as coming from both sources
      console.log(`Merged duplicate chunk_id: ${key}`);
    } else {
      combinedResults.set(key, {
        ...result,
        final_score: (result.similarity_score || 0) * keywordWeight,
        source_type: 'keyword'
      });
    }
  });
  
  // Sort by final score and limit results
  const finalResults = Array.from(combinedResults.values())
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, maxResults);
  
  console.log(`Hybrid final: ${finalResults.length} results after filtering`);
  console.log(`Deduplication stats - Original: ${semanticResults.length + keywordResults.length}, Final: ${finalResults.length}, Duplicates removed: ${(semanticResults.length + keywordResults.length) - finalResults.length}`);
  
  return finalResults;
}

/**
 * Perform medical table search (placeholder for now)
 */
async function performMedicalTableSearch(query: string, userId: string, maxResults: number) {
  console.log('Medical table search not fully implemented yet');
  return [];
}

/**
 * Extract keywords from query
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 10); // Limit keywords
}

/**
 * Calculate estimated page number from chunk index
 */
function calculatePageNumber(chunkIndex: number): number {
  // Assume ~3-5 chunks per page for typical documents
  return Math.floor(chunkIndex / 4) + 1;
}

/**
 * GET endpoint for API documentation
 */
export async function GET() {
  return NextResponse.json({
    message: 'RAG Chat API',
    description: 'Ask questions and get AI-powered answers based on your uploaded documents',
    method: 'POST',
    endpoint: '/api/chat',
    parameters: {
      question: 'string (required) - Your question',
      userId: 'string (optional) - User identifier, defaults to "demo-user"',
      searchMode: 'string (optional) - "semantic", "keyword", "hybrid", "medical_tables", defaults to "hybrid"',
      maxResults: 'number (optional) - Maximum search results to use as context, max 20, defaults to 10',
      similarityThreshold: 'number (optional) - Minimum similarity for semantic search, 0.0-1.0, defaults to 0.3'
    },
    example: {
      question: 'What is diabetes?',
      userId: 'demo-user',
      searchMode: 'hybrid',
      maxResults: 10
    }
  });
}