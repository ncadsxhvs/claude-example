'use client';

import { useState } from 'react';

interface SearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  chunk_text: string;
  chunk_index: number;
  similarity_score: number;
}

interface MedicalTableResult {
  tableId: number;
  documentId: string;
  filename: string;
  tableIndex: number;
  tableType: string;
  headers: string[];
  similarityScore: number;
  searchableText: string;
  rawData: string[][];
  confidence: number;
}

export default function SimpleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [medicalTables, setMedicalTables] = useState<MedicalTableResult[]>([]);
  const [isMedicalQuery, setIsMedicalQuery] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxResults, setMaxResults] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.4);
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword' | 'hybrid' | 'medical_tables'>('hybrid');
  const [searchDetails, setSearchDetails] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

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
          userId: 'demo-user',
          maxResults,
          similarityThreshold,
          searchMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setMedicalTables(data.medicalTables || []);
        setIsMedicalQuery(data.isMedicalQuery || false);
        setSearchDetails(data.searchDetails);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const formatSimilarity = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.8) return 'text-blue-600 bg-blue-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const getTableTypeColor = (type: string) => {
    switch (type) {
      case 'lab_results': return 'bg-blue-100 text-blue-800';
      case 'vital_signs': return 'bg-green-100 text-green-800';
      case 'medication': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTableType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="p-6">
      {/* Search Form */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vector Similarity Search</h3>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-16"
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-2 top-2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSearching ? '...' : '🔍'}
              </button>
            </div>
          </div>

          {/* Search Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Mode
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'semantic' as const, label: 'Semantic', description: 'AI embeddings only' },
                { value: 'keyword' as const, label: 'Keyword', description: 'Exact word matching' },
                { value: 'hybrid' as const, label: 'Hybrid', description: 'Smart combination' },
                { value: 'medical_tables' as const, label: 'Medical Tables', description: 'Table search only' }
              ].map((mode) => (
                <label
                  key={mode.value}
                  className={`relative flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                    searchMode === mode.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={mode.value}
                    checked={searchMode === mode.value}
                    onChange={(e) => setSearchMode(e.target.value as any)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{mode.label}</span>
                  <span className="text-xs text-gray-500 mt-1">{mode.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Search Parameters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Results: {maxResults}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500">1 - 20 results</div>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Similarity Threshold: {similarityThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full"
                disabled={searchMode === 'keyword'}
              />
              <div className="text-xs text-gray-500">
                {searchMode === 'keyword' ? 'Not used for keyword search' : '0.1 (loose) - 1.0 (exact)'}
              </div>
            </div>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900">
            Search Results
            {(results.length > 0 || medicalTables.length > 0) && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({results.length} text chunks{medicalTables.length > 0 ? `, ${medicalTables.length} medical tables` : ''})
              </span>
            )}
            {isMedicalQuery && (
              <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                Medical Query Detected
              </span>
            )}
          </h4>
        </div>

        {isSearching ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔄</div>
            <p className="text-gray-500">Searching vector database...</p>
          </div>
        ) : (results.length > 0 || medicalTables.length > 0) ? (
          <div className="space-y-6">
            {/* Medical Table Results */}
            {medicalTables.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  🏥 Medical Tables
                  <span className="text-sm text-gray-500 font-normal">
                    ({medicalTables.length} found)
                  </span>
                </h5>
                <div className="space-y-4">
                  {medicalTables.map((table, index) => (
                    <div
                      key={table.tableId}
                      className="p-4 border border-blue-200 rounded-lg bg-blue-50/30 hover:shadow-sm transition-shadow"
                    >
                      {/* Table Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h6 className="font-medium text-gray-900">{table.filename}</h6>
                            <span className="text-xs text-gray-500">
                              Table {table.tableIndex + 1}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTableTypeColor(table.tableType)}`}>
                              {formatTableType(table.tableType)}
                            </span>
                          </div>
                        </div>
                        
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(table.similarityScore)}`}>
                          {formatSimilarity(table.similarityScore)} similar
                        </span>
                      </div>

                      {/* Table Content */}
                      <div className="bg-white rounded border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {table.headers.map((header, headerIndex) => (
                                <th key={headerIndex} className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rawData.slice(0, 3).map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-t border-gray-200">
                                {row.map((cell, cellIndex) => (
                                  <td key={cellIndex} className="px-3 py-2 text-gray-700 border-r border-gray-100 last:border-r-0">
                                    <span dangerouslySetInnerHTML={{ __html: highlightQuery(cell, query) }} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {table.rawData.length > 3 && (
                              <tr className="border-t border-gray-200 bg-gray-50">
                                <td colSpan={table.headers.length} className="px-3 py-2 text-center text-gray-500 text-xs">
                                  ... and {table.rawData.length - 3} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Chunk Results */}
            {results.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  📄 Text Chunks
                  <span className="text-sm text-gray-500 font-normal">
                    ({results.length} found)
                  </span>
                </h5>
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div
                      key={result.chunk_id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      {/* Result Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h6 className="font-medium text-gray-900">{result.filename}</h6>
                            <span className="text-xs text-gray-500">
                              Chunk {result.chunk_index + 1}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              Result #{index + 1}
                            </span>
                          </div>
                        </div>
                        
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getScoreColor(result.similarity_score)}`}>
                          {formatSimilarity(result.similarity_score)} similar
                        </span>
                      </div>

                      {/* Result Content */}
                      <div 
                        className="text-gray-700 text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightQuery(result.chunk_text, query) 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : query && !isSearching ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-gray-500">No results found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-2">
              Try lowering the similarity threshold or using different keywords
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-gray-500">Enter a search query to find similar content</p>
            <p className="text-sm text-gray-400 mt-2">
              Choose a search mode to test different approaches
            </p>
          </div>
        )}

        {/* Search Details (Debug Information) */}
        {searchDetails && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              🔍 Search Details
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                {searchDetails.searchType}
              </span>
            </h5>
            <div className="text-sm space-y-2">
              {searchDetails.searchType === 'semantic' && (
                <>
                  <div>Embedding dimensions: {searchDetails.embeddingDimensions}</div>
                  <div>Tokens used: {searchDetails.tokensUsed}</div>
                  <div>Threshold: {searchDetails.threshold}</div>
                </>
              )}
              
              {searchDetails.searchType === 'keyword' && (
                <>
                  <div>Keywords: [{searchDetails.keywords?.join(', ')}]</div>
                  <div className="text-xs text-gray-600 font-mono">
                    {searchDetails.keywordConditions}
                  </div>
                </>
              )}
              
              {searchDetails.searchType === 'hybrid' && (
                <>
                  <div>Semantic results: {searchDetails.semanticResults}</div>
                  <div>Keyword results: {searchDetails.keywordResults}</div>
                  <div>Semantic weight: {searchDetails.semanticWeight}</div>
                  <div>Keyword weight: {searchDetails.keywordWeight}</div>
                  <div>Hybrid threshold: {searchDetails.hybridThreshold}</div>
                  <div>Good semantic quality: {searchDetails.hasGoodSemanticResults ? 'Yes' : 'No'}</div>
                </>
              )}
              
              {searchDetails.message && (
                <div className="text-blue-600">{searchDetails.message}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}