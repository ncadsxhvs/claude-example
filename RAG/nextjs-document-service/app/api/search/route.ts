import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '../../../lib/embeddings';
import { searchSimilarChunks } from '../../../lib/database';
import { db } from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      userId = 'demo-user', 
      maxResults = 5, 
      similarityThreshold = 0.3,
      searchMode = 'hybrid' // Options: 'semantic', 'keyword', 'hybrid', 'medical_tables'
    } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required', success: false },
        { status: 400 }
      );
    }

    console.log(`Search request: "${query}" (mode: ${searchMode}, threshold: ${similarityThreshold})`);

    let results = [];
    let searchDetails = {};

    switch (searchMode) {
      case 'semantic':
        ({ results, searchDetails } = await performSemanticSearch(query, userId, maxResults, similarityThreshold));
        break;
      
      case 'keyword':
        ({ results, searchDetails } = await performKeywordSearch(query, userId, maxResults));
        break;
      
      case 'hybrid':
        ({ results, searchDetails } = await performHybridSearch(query, userId, maxResults, similarityThreshold));
        break;
      
      case 'medical_tables':
        ({ results, searchDetails } = await performMedicalTableSearch(query, userId, maxResults, similarityThreshold));
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid search mode', success: false },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      query,
      searchMode,
      results,
      resultsCount: results.length,
      searchDetails,
      searchParams: {
        maxResults,
        similarityThreshold,
        userId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Search failed', 
        success: false,
        query: '',
        results: [],
        resultsCount: 0
      },
      { status: 500 }
    );
  }
}

// Semantic search using embeddings only
async function performSemanticSearch(query: string, userId: string, maxResults: number, threshold: number) {
  console.log(`Performing semantic search for: "${query}"`);
  
  const embeddingResult = await generateEmbedding(query);
  console.log(`Generated embedding with ${embeddingResult.embedding.length} dimensions`);
  
  const results = await searchSimilarChunks(
    embeddingResult.embedding,
    userId,
    threshold,
    maxResults
  );

  console.log(`Semantic search found ${results.length} results`);
  
  return {
    results: results.map(r => ({
      chunk_id: r.chunk_id,
      document_id: r.document_id,
      filename: r.filename,
      chunk_text: r.chunk_text,
      chunk_index: r.chunk_index,
      similarity_score: r.similarity_score,
      search_type: 'semantic'
    })),
    searchDetails: {
      embeddingDimensions: embeddingResult.embedding.length,
      tokensUsed: embeddingResult.usage.total_tokens,
      threshold,
      searchType: 'semantic'
    }
  };
}

// Keyword search using SQL LIKE/ILIKE only
async function performKeywordSearch(query: string, userId: string, maxResults: number) {
  console.log(`Performing keyword search for: "${query}"`);
  
  // Extract keywords (basic implementation)
  const keywords = query.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  console.log(`Extracted keywords: ${keywords.join(', ')}`);
  
  if (keywords.length === 0) {
    return { results: [], searchDetails: { keywords: [], searchType: 'keyword' } };
  }

  // Search for any of the keywords
  const keywordConditions = keywords.map((_, index) => `c.text ILIKE $${index + 3}`).join(' OR ');
  const keywordQuery = `
    SELECT c.id as chunk_id, c.document_id, d.filename, c.text as chunk_text, 
           c.chunk_index, 0.8 as keyword_score
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE d.user_id = $1 
      AND d.status = 'completed'
      AND (${keywordConditions})
    ORDER BY c.chunk_index
    LIMIT $2
  `;
  
  const keywordParams = [
    userId,                                    // $1
    maxResults,                               // $2
    ...keywords.map(keyword => `%${keyword}%`) // $3, $4, $5...
  ];
  
  const keywordResults = await db.query(keywordQuery, keywordParams);
  console.log(`Keyword search found ${keywordResults.rows.length} results`);

  return {
    results: keywordResults.rows.map((r: any) => ({
      chunk_id: r.chunk_id,
      document_id: r.document_id,
      filename: r.filename,
      chunk_text: r.chunk_text,
      chunk_index: r.chunk_index,
      similarity_score: r.keyword_score,
      search_type: 'keyword'
    })),
    searchDetails: {
      keywords,
      keywordConditions,
      searchType: 'keyword'
    }
  };
}

// Hybrid search combining semantic and keyword
async function performHybridSearch(query: string, userId: string, maxResults: number, threshold: number) {
  console.log(`Performing hybrid search for: "${query}"`);
  
  // Get semantic results
  const { results: semanticResults, searchDetails: semanticDetails } = 
    await performSemanticSearch(query, userId, maxResults * 2, threshold);
  
  // Get keyword results
  const { results: keywordResults, searchDetails: keywordDetails } = 
    await performKeywordSearch(query, userId, maxResults * 2);

  console.log(`Hybrid: ${semanticResults.length} semantic + ${keywordResults.length} keyword results`);

  // Determine weighting based on semantic quality
  const hasGoodSemanticResults = semanticResults.some((r: any) => r.similarity_score > 0.4);
  const semanticWeight = hasGoodSemanticResults ? 0.8 : 0.4;
  const keywordWeight = hasGoodSemanticResults ? 0.2 : 0.6;
  const hybridThreshold = hasGoodSemanticResults ? 0.25 : 0.2;

  console.log(`Hybrid weights - semantic: ${semanticWeight}, keyword: ${keywordWeight}, threshold: ${hybridThreshold}`);

  // Combine results with proper deduplication
  const combinedResults = new Map();
  
  // Add semantic results
  semanticResults.forEach((result: any) => {
    const key = String(result.chunk_id); // Ensure string key
    const hybridScore = result.similarity_score * semanticWeight;
    combinedResults.set(key, {
      ...result,
      semantic_score: result.similarity_score,
      keyword_score: 0,
      combined_score: hybridScore,
      search_type: 'hybrid'
    });
  });

  // Add/boost keyword results
  keywordResults.forEach((result: any) => {
    const key = String(result.chunk_id); // Ensure string key
    const existing = combinedResults.get(key);
    const keywordScore = result.similarity_score * keywordWeight;
    
    if (existing) {
      existing.keyword_score = result.similarity_score;
      existing.combined_score += keywordScore;
      console.log(`Merged duplicate chunk_id: ${key} (semantic + keyword)`);
    } else {
      combinedResults.set(key, {
        ...result,
        semantic_score: 0,
        keyword_score: result.similarity_score,
        combined_score: keywordScore,
        search_type: 'hybrid'
      });
    }
  });

  // Filter and sort
  const finalResults = Array.from(combinedResults.values())
    .filter((result: any) => result.combined_score >= hybridThreshold)
    .sort((a: any, b: any) => b.combined_score - a.combined_score)
    .slice(0, maxResults);

  console.log(`Hybrid final: ${finalResults.length} results after filtering`);
  console.log(`Deduplication stats - Original: ${semanticResults.length + keywordResults.length}, Final: ${finalResults.length}, Duplicates removed: ${(semanticResults.length + keywordResults.length) - finalResults.length}`);

  return {
    results: finalResults.map((r: any) => ({
      chunk_id: r.chunk_id,
      document_id: r.document_id,
      filename: r.filename,
      chunk_text: r.chunk_text,
      chunk_index: r.chunk_index,
      similarity_score: r.combined_score,
      semantic_score: r.semantic_score,
      keyword_score: r.keyword_score,
      search_type: 'hybrid'
    })),
    searchDetails: {
      semanticResults: semanticResults.length,
      keywordResults: keywordResults.length,
      semanticWeight,
      keywordWeight,
      hybridThreshold,
      hasGoodSemanticResults,
      semanticDetails,
      keywordDetails,
      searchType: 'hybrid'
    }
  };
}

// Medical table search using the medical table processor
async function performMedicalTableSearch(query: string, userId: string, maxResults: number, threshold: number) {
  console.log(`Performing medical table search for: "${query}"`);
  
  try {
    // Import the medical table search function
    const { searchMedicalTables } = await import('../../../lib/medical-table-processor');
    
    // Search medical tables
    const results = await searchMedicalTables(query, userId, {
      limit: maxResults,
      similarityThreshold: threshold
    });
    
    console.log(`Medical table search found ${results.length} results`);
    
    return {
      results: results.map((result: any) => ({
        chunk_id: `table-${result.table_id}`,
        document_id: result.document_id,
        filename: result.filename,
        chunk_text: result.searchable_text,
        chunk_index: result.table_index,
        similarity_score: parseFloat(result.similarity_score),
        search_type: 'medical_table',
        table_type: result.table_type,
        headers: result.headers,
        raw_data: JSON.parse(result.raw_data),
        confidence: parseFloat(result.confidence_score)
      })),
      searchDetails: {
        totalResults: results.length,
        threshold,
        searchType: 'medical_tables'
      }
    };
    
  } catch (error: any) {
    console.error('Medical table search error:', error);
    return {
      results: [],
      searchDetails: {
        error: error.message,
        searchType: 'medical_tables'
      }
    };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Advanced Search API',
    methods: ['POST'],
    endpoint: '/api/search',
    searchModes: [
      {
        mode: 'semantic',
        description: 'Uses AI embeddings for semantic similarity search'
      },
      {
        mode: 'keyword', 
        description: 'Uses SQL LIKE queries for exact keyword matching'
      },
      {
        mode: 'hybrid',
        description: 'Combines semantic and keyword search with intelligent weighting'
      },
      {
        mode: 'medical_tables',
        description: 'Searches specifically through extracted medical tables'
      }
    ],
    parameters: {
      query: 'string (required) - search query',
      userId: 'string (optional) - user ID filter',
      maxResults: 'number (optional) - max results (default: 5)',
      similarityThreshold: 'number (optional) - similarity threshold (default: 0.3)',
      searchMode: 'string (optional) - search mode (default: hybrid)'
    }
  });
}