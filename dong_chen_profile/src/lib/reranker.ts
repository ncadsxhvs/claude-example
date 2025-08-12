/**
 * Re-ranking system for search results
 * Adjusts scores based on multiple relevance signals
 */

import { HybridSearchResult } from './database';

export interface RerankedResult extends HybridSearchResult {
  original_combined_score: number;
  reranked_score: number;
  reranking_factors: {
    length_penalty: number;
    position_boost: number;
    keyword_density: number;
    query_coverage: number;
  };
}

export interface RerankingOptions {
  // Length preferences
  idealChunkLength?: number;
  lengthPenaltyWeight?: number;
  
  // Position preferences (earlier chunks often more important)
  positionBoostWeight?: number;
  
  // Query matching preferences
  keywordDensityWeight?: number;
  queryCoverageWeight?: number;
  
  // Final reranking weight vs original score
  rerankingWeight?: number;
}

export class SearchReranker {
  private options: Required<RerankingOptions>;

  constructor(options: RerankingOptions = {}) {
    this.options = {
      idealChunkLength: 500,
      lengthPenaltyWeight: 0.1,
      positionBoostWeight: 0.15,
      keywordDensityWeight: 0.2,
      queryCoverageWeight: 0.25,
      rerankingWeight: 0.3,
      ...options
    };
  }

  /**
   * Re-rank search results based on multiple relevance signals
   */
  rerank(results: HybridSearchResult[], query: string): RerankedResult[] {
    const queryTerms = this.extractQueryTerms(query);
    
    const rerankedResults = results.map((result, index) => {
      const factors = this.calculateRerankingFactors(result, query, queryTerms, index);
      
      // Calculate final reranked score
      const rerankingBoost = 
        factors.length_penalty * this.options.lengthPenaltyWeight +
        factors.position_boost * this.options.positionBoostWeight +
        factors.keyword_density * this.options.keywordDensityWeight +
        factors.query_coverage * this.options.queryCoverageWeight;

      const rerankedScore = 
        result.combined_score * (1 - this.options.rerankingWeight) +
        (result.combined_score + rerankingBoost) * this.options.rerankingWeight;

      return {
        ...result,
        original_combined_score: result.combined_score,
        reranked_score: Math.min(1.0, Math.max(0.0, rerankedScore)), // Clamp to [0,1]
        reranking_factors: factors
      };
    });

    // Sort by reranked score
    return rerankedResults.sort((a, b) => b.reranked_score - a.reranked_score);
  }

  private calculateRerankingFactors(
    result: HybridSearchResult, 
    query: string, 
    queryTerms: string[], 
    position: number
  ) {
    const textLength = result.chunk_text.length;
    const chunkWords = result.chunk_text.toLowerCase().split(/\s+/);
    const chunkText = result.chunk_text.toLowerCase();
    
    // 1. Length penalty - prefer chunks close to ideal length
    const lengthDifference = Math.abs(textLength - this.options.idealChunkLength);
    const maxLengthDifference = this.options.idealChunkLength;
    const lengthPenalty = 1 - Math.min(lengthDifference / maxLengthDifference, 1);
    
    // 2. Position boost - earlier chunks in document are often more important
    const positionBoost = Math.max(0, 1 - (result.chunk_index * 0.1));
    
    // 3. Keyword density - how densely packed are query terms
    const queryTermsInChunk = queryTerms.filter(term => 
      chunkText.includes(term.toLowerCase())
    ).length;
    const keywordDensity = queryTerms.length > 0 ? queryTermsInChunk / queryTerms.length : 0;
    
    // 4. Query coverage - what percentage of the query is covered
    const queryWordsInChunk = query.toLowerCase().split(/\s+/).filter(word => 
      chunkText.includes(word) && word.length > 2 // Ignore short words
    ).length;
    const totalQueryWords = query.split(/\s+/).filter(word => word.length > 2).length;
    const queryCoverage = totalQueryWords > 0 ? queryWordsInChunk / totalQueryWords : 0;

    return {
      length_penalty: lengthPenalty,
      position_boost: positionBoost,
      keyword_density: keywordDensity,
      query_coverage: queryCoverage
    };
  }

  private extractQueryTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter out short words
      .filter(term => !this.isStopWord(term));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'shall', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Get reranking explanation for debugging/transparency
   */
  explainReranking(result: RerankedResult): string {
    const factors = result.reranking_factors;
    return `
Reranking Analysis for "${result.filename}" (Section ${result.chunk_index + 1}):
- Original Score: ${(result.original_combined_score * 100).toFixed(1)}%
- Reranked Score: ${(result.reranked_score * 100).toFixed(1)}%

Reranking Factors:
- Length Penalty: ${(factors.length_penalty * 100).toFixed(1)}% (ideal length preference)
- Position Boost: ${(factors.position_boost * 100).toFixed(1)}% (earlier sections preferred)
- Keyword Density: ${(factors.keyword_density * 100).toFixed(1)}% (query term concentration)
- Query Coverage: ${(factors.query_coverage * 100).toFixed(1)}% (query term coverage)

Score Breakdown:
- Semantic Score: ${(result.semantic_score * 100).toFixed(1)}%
- Keyword Score: ${(result.keyword_score * 100).toFixed(1)}%
- Combined Score: ${(result.combined_score * 100).toFixed(1)}%
    `.trim();
  }
}

// Default reranker instance
export const defaultReranker = new SearchReranker();