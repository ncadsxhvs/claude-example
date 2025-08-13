'use client';

import { useState, useRef, useEffect } from 'react';
import { SearchResults } from './SearchResults';

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
    rerankingFactors?: any;
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

interface SearchInterfaceProps {
  userId?: string;
  onResultSelect?: (result: SearchResult) => void;
}

export default function SearchInterface({ userId = 'demo-user', onResultSelect }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search configuration
  const [searchType, setSearchType] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [maxResults, setMaxResults] = useState(10);
  const [semanticWeight, setSemanticWeight] = useState(0.7);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [enableReranking, setEnableReranking] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Ensure weights sum to 1.0
  useEffect(() => {
    if (searchType === 'hybrid') {
      const newKeywordWeight = 1 - semanticWeight;
      if (Math.abs(newKeywordWeight - keywordWeight) > 0.01) {
        setKeywordWeight(newKeywordWeight);
      }
    }
  }, [semanticWeight, searchType]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!query.trim() || query.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userId,
          searchType,
          maxResults,
          semanticWeight,
          keywordWeight,
          similarityThreshold,
          enableReranking,
          includeMetadata: true
        })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data);
        setError(null);
      } else {
        setError(data.error || 'Search failed');
        setSearchResults(null);
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults(null);
    setError(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">🔍</div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Search</h2>
            <p className="text-sm text-gray-600">
              Search through your uploaded documents using semantic understanding and keyword matching
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your search query..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
              disabled={isSearching}
            />
            <div className="absolute right-2 top-2 flex gap-2">
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 py-1 text-gray-500 hover:text-gray-700"
                  disabled={isSearching}
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Type Selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Search Type:</span>
            <div className="flex gap-3">
              {[
                { value: 'hybrid', label: 'Hybrid (Recommended)', desc: 'Semantic + Keywords' },
                { value: 'semantic', label: 'Semantic', desc: 'Meaning-based' },
                { value: 'keyword', label: 'Keyword', desc: 'Exact matches' }
              ].map((type) => (
                <label key={type.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={type.value}
                    checked={searchType === type.value}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-gray-500 ml-1">({type.desc})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
            
            {searchResults && (
              <div className="text-sm text-gray-600">
                Found {searchResults.resultsCount} results in {searchResults.searchMethod}
              </div>
            )}
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Results: {maxResults}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">5 - 50 results</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Similarity Threshold: {similarityThreshold.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="0.9"
                    step="0.1"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">0.3 (loose) - 0.9 (strict)</div>
                </div>

                {searchType === 'hybrid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semantic Weight: {semanticWeight.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={semanticWeight}
                      onChange={(e) => setSemanticWeight(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">
                      Keywords: {keywordWeight.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableReranking}
                    onChange={(e) => setEnableReranking(e.target.checked)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium">Enable Re-ranking</span>
                  <span className="text-sm text-gray-500">
                    (Improves relevance using multiple factors)
                  </span>
                </label>
              </div>
            </div>
          )}
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults && (
        <SearchResults 
          searchResponse={searchResults}
          onResultSelect={onResultSelect}
          showMetadata={showAdvanced}
        />
      )}

      {/* Empty State */}
      {!searchResults && !isSearching && !error && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Search</h3>
          <p className="text-gray-600">
            Enter a search query above to find relevant content in your uploaded documents.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Searching...</h3>
          <p className="text-gray-600">
            Analyzing your documents using {searchType} search
            {enableReranking && ' with intelligent re-ranking'}...
          </p>
        </div>
      )}
    </div>
  );
}