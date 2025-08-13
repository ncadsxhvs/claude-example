'use client';

import { useState } from 'react';

interface SearchResult {
  id: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  text: string;
  scores: {
    semantic: number;
    keyword: number;
    combined: number;
    final: number;
  };
  metadata?: {
    rerankingFactors?: {
      length_penalty: number;
      position_boost: number;
      keyword_density: number;
      query_coverage: number;
    };
    originalScore?: number;
  };
}

interface SearchResponse {
  success: boolean;
  query: string;
  searchMethod: string;
  resultsCount: number;
  results: SearchResult[];
  searchParams: {
    searchType: string;
    maxResults: number;
    semanticWeight: number;
    keywordWeight: number;
    similarityThreshold: number;
    enableReranking: boolean;
  };
  timing: {
    timestamp: string;
  };
}

interface SearchResultsProps {
  searchResponse: SearchResponse;
  onResultSelect?: (result: SearchResult) => void;
  showMetadata?: boolean;
}

export function SearchResults({ searchResponse, onResultSelect, showMetadata = false }: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'relevance' | 'filename' | 'position'>('relevance');

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const formatScore = (score: number): string => {
    return (score * 100).toFixed(1) + '%';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-blue-600 bg-blue-50';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const highlightText = (text: string, query: string): string => {
    if (!query) return text;
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    let highlightedText = text;
    
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return highlightedText;
  };

  const sortedResults = [...searchResponse.results].sort((a, b) => {
    switch (sortBy) {
      case 'filename':
        return a.filename.localeCompare(b.filename);
      case 'position':
        return a.filename.localeCompare(b.filename) || a.chunkIndex - b.chunkIndex;
      case 'relevance':
      default:
        return b.scores.final - a.scores.final;
    }
  });

  const truncateText = (text: string, maxLength: number = 300): { text: string; isTruncated: boolean } => {
    if (text.length <= maxLength) {
      return { text, isTruncated: false };
    }
    return { text: text.substring(0, maxLength) + '...', isTruncated: true };
  };

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              Search Results for "{searchResponse.query}"
            </h3>
            <div className="text-sm text-gray-600 mt-1">
              {searchResponse.resultsCount} results found using {searchResponse.searchMethod}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="relevance">Relevance</option>
              <option value="filename">Filename</option>
              <option value="position">Document Position</option>
            </select>
          </div>
        </div>

        {/* Search Parameters Summary */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full ${
            searchResponse.searchParams.searchType === 'hybrid' ? 'bg-blue-100 text-blue-700' :
            searchResponse.searchParams.searchType === 'semantic' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {searchResponse.searchParams.searchType.toUpperCase()}
          </span>
          
          {searchResponse.searchParams.enableReranking && (
            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700">
              RE-RANKED
            </span>
          )}
          
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            Threshold: {formatScore(searchResponse.searchParams.similarityThreshold)}
          </span>
          
          {searchResponse.searchParams.searchType === 'hybrid' && (
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              Semantic: {formatScore(searchResponse.searchParams.semanticWeight)} | 
              Keywords: {formatScore(searchResponse.searchParams.keywordWeight)}
            </span>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {sortedResults.map((result, index) => {
          const isExpanded = expandedResults.has(result.id);
          const { text: displayText, isTruncated } = truncateText(result.text, isExpanded ? Infinity : 300);
          
          return (
            <div
              key={result.id}
              className="bg-white rounded-lg shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onResultSelect && onResultSelect(result)}
            >
              {/* Result Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{result.filename}</h4>
                    <span className="text-xs text-gray-500">
                      Section {result.chunkIndex + 1}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      Result #{index + 1}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(result.scores.final)}`}>
                    {formatScore(result.scores.final)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(result.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>
              </div>

              {/* Result Content */}
              <div className="text-gray-700 text-sm leading-relaxed mb-3">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(displayText, searchResponse.query) 
                  }}
                />
                {isTruncated && !isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(result.id);
                    }}
                    className="text-blue-600 hover:text-blue-700 ml-2"
                  >
                    Show more
                  </button>
                )}
              </div>

              {/* Score Breakdown */}
              <div className="flex flex-wrap gap-3 text-xs">
                {searchResponse.searchParams.searchType === 'hybrid' && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Semantic:</span>
                      <span className="font-medium">{formatScore(result.scores.semantic)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Keywords:</span>
                      <span className="font-medium">{formatScore(result.scores.keyword)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Combined:</span>
                      <span className="font-medium">{formatScore(result.scores.combined)}</span>
                    </div>
                  </>
                )}
                
                {searchResponse.searchParams.enableReranking && result.metadata?.originalScore && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Original:</span>
                    <span className="font-medium">{formatScore(result.metadata.originalScore)}</span>
                    <span className="text-green-600">→</span>
                    <span className="font-medium text-green-600">{formatScore(result.scores.final)}</span>
                  </div>
                )}
              </div>

              {/* Advanced Metadata */}
              {showMetadata && isExpanded && result.metadata?.rerankingFactors && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">Re-ranking Factors:</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Length Penalty:</span>
                      <div className="font-medium">{formatScore(result.metadata.rerankingFactors.length_penalty)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Position Boost:</span>
                      <div className="font-medium">{formatScore(result.metadata.rerankingFactors.position_boost)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Keyword Density:</span>
                      <div className="font-medium">{formatScore(result.metadata.rerankingFactors.keyword_density)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Query Coverage:</span>
                      <div className="font-medium">{formatScore(result.metadata.rerankingFactors.query_coverage)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {searchResponse.resultsCount === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-600 mb-4">
            No documents match your search query "{searchResponse.query}".
          </p>
          <div className="text-sm text-gray-500">
            Try:
            <ul className="mt-2 space-y-1">
              <li>• Using different keywords</li>
              <li>• Lowering the similarity threshold</li>
              <li>• Switching to keyword search for exact matches</li>
              <li>• Uploading more documents</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}