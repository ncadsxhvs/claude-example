/**
 * Document Search API Endpoint
 * Provides hybrid semantic + keyword search with re-ranking
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChunkService, HybridSearchResult } from '@/lib/database';
import { defaultReranker, RerankedResult } from '@/lib/reranker';
import { generateQueryEmbedding } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      userId = 'demo-user',
      searchType = 'hybrid',
      maxResults = 10,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      similarityThreshold = 0.6,
      enableReranking = true,
      includeMetadata = true
    } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    let searchResults: HybridSearchResult[] | RerankedResult[] = [];
    let searchMethod = '';

    try {
      if (searchType === 'semantic' || searchType === 'hybrid') {
        // Generate query embedding for semantic/hybrid search
        const queryEmbedding = await generateQueryEmbedding(trimmedQuery);
        
        if (searchType === 'hybrid') {
          // Hybrid search (semantic + keyword)
          searchResults = await ChunkService.searchHybridChunks(
            queryEmbedding,
            trimmedQuery,
            userId,
            {
              semanticWeight,
              keywordWeight,
              similarityThreshold,
              maxResults: enableReranking ? maxResults * 2 : maxResults // Get more for reranking
            }
          );
          searchMethod = 'hybrid';
        } else {
          // Pure semantic search
          const semanticResults = await ChunkService.searchSimilarChunks(
            queryEmbedding,
            userId,
            {
              similarityThreshold,
              maxResults: enableReranking ? maxResults * 2 : maxResults
            }
          );
          
          // Convert to hybrid format for consistency
          searchResults = semanticResults.map(result => ({
            ...result,
            semantic_score: result.similarity_score,
            keyword_score: 0,
            combined_score: result.similarity_score
          }));
          searchMethod = 'semantic';
        }
      } else if (searchType === 'keyword') {
        // Keyword-only search
        const keywordResults = await ChunkService.searchKeywordChunks(
          trimmedQuery,
          userId,
          { maxResults: enableReranking ? maxResults * 2 : maxResults }
        );
        
        // Convert to hybrid format
        searchResults = keywordResults.map(result => ({
          ...result,
          semantic_score: 0,
          keyword_score: result.keyword_score,
          combined_score: result.keyword_score,
          similarity_score: result.keyword_score
        }));
        searchMethod = 'keyword';
      }

      // Apply re-ranking if enabled
      if (enableReranking && searchResults.length > 0) {
        searchResults = defaultReranker.rerank(searchResults as HybridSearchResult[], trimmedQuery);
        searchMethod += ' + reranked';
        
        // Take final top results after reranking
        searchResults = searchResults.slice(0, maxResults);
      } else if (searchResults.length > maxResults) {
        searchResults = searchResults.slice(0, maxResults);
      }

      // Prepare response
      const response: any = {
        success: true,
        query: trimmedQuery,
        searchMethod,
        resultsCount: searchResults.length,
        results: searchResults.map((result: any) => {
          const baseResult = {
            id: result.chunk_id,
            documentId: result.document_id,
            filename: result.filename,
            chunkIndex: result.chunk_index,
            text: result.chunk_text,
            scores: {
              semantic: result.semantic_score || 0,
              keyword: result.keyword_score || 0,
              combined: result.combined_score || result.similarity_score || 0,
              final: result.reranked_score || result.combined_score || result.similarity_score || 0
            }
          };

          if (includeMetadata && result.reranking_factors) {
            baseResult.metadata = {
              rerankingFactors: result.reranking_factors,
              originalScore: result.original_combined_score
            };
          }

          return baseResult;
        }),
        searchParams: {
          searchType,
          maxResults,
          semanticWeight,
          keywordWeight,
          similarityThreshold,
          enableReranking
        },
        timing: {
          timestamp: new Date().toISOString()
        }
      };

      return NextResponse.json(response);

    } catch (searchError: any) {
      console.error('Search execution error:', searchError);
      return NextResponse.json(
        { error: `Search failed: ${searchError.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to process search request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const userId = searchParams.get('userId') || 'demo-user';
  const searchType = searchParams.get('type') || 'hybrid';
  const maxResults = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({
      message: 'Document Search API',
      usage: {
        'POST /api/search': 'Full search with all options',
        'GET /api/search?q=query&userId=user&type=hybrid&limit=10': 'Quick search'
      },
      searchTypes: ['hybrid', 'semantic', 'keyword'],
      features: ['re-ranking', 'relevance scoring', 'metadata']
    });
  }

  // Convert GET to POST format for processing
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      query,
      userId,
      searchType,
      maxResults
    })
  }));
}