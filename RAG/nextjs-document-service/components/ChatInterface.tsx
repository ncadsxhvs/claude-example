'use client';

import { useState } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
  searchResultsCount?: number;
  tokensUsed?: number;
  modelUsed?: string;
}

interface ChatSource {
  chunk_id: string;
  document: string;
  page: number;
  relevance_score: number;
  text_preview: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword' | 'hybrid' | 'medical_tables'>('hybrid');
  const [maxResults, setMaxResults] = useState(10);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    const currentQuestion = question.trim();
    setQuestion('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          userId: 'demo-user',
          searchMode,
          maxResults,
          similarityThreshold,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          sources: data.sources || [],
          searchResultsCount: data.search_results_count || 0,
          tokensUsed: data.tokens_used || 0,
          modelUsed: data.model_used || 'unknown'
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(data.error || 'Failed to get response from AI');
      }
    } catch (err) {
      setError('Failed to connect to AI service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 bg-green-50';
    if (score >= 0.8) return 'text-blue-600 bg-blue-50';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Chat with RAG</h3>
        <p className="text-sm text-gray-600">
          Ask questions about your uploaded documents and get AI-powered answers with source citations
        </p>
        
        {/* Settings */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-gray-700">Mode:</label>
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="semantic">Semantic</option>
              <option value="keyword">Keyword</option>
              <option value="hybrid">Hybrid</option>
              <option value="medical_tables">Medical Tables</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-gray-700">Max Results:</label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 w-16 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-gray-700">Threshold:</label>
            <input
              type="number"
              min="0.1"
              max="1.0"
              step="0.1"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 w-16 text-sm"
              disabled={searchMode === 'keyword'}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤖</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Ask AI About Your Documents</h4>
            <p className="text-gray-600 mb-4">
              Get intelligent answers based on your uploaded documents with source citations
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• "What is diabetes and what are its symptoms?"</p>
              <p>• "Which provinces allow drugs according to the data?"</p>
              <p>• "Summarize the main findings from the medical reports"</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Assistant message metadata */}
                {message.type === 'assistant' && (
                  <div className="mt-3 text-xs text-gray-500 space-y-2">
                    <div className="flex items-center gap-2">
                      <span>🔍 {message.searchResultsCount} sources</span>
                      <span>•</span>
                      <span>🧠 {message.modelUsed}</span>
                      <span>•</span>
                      <span>⚡ {message.tokensUsed} tokens</span>
                      <span>•</span>
                      <span>🕒 {formatTimestamp(message.timestamp)}</span>
                    </div>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">Sources:</div>
                        <div className="space-y-1">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <div
                              key={source.chunk_id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-gray-400">#{index + 1}</span>
                              <span className="font-medium">{source.document}</span>
                              <span className="text-gray-400">page {source.page}</span>
                              <span className={`px-1 py-0.5 rounded text-xs ${getScoreColor(source.relevance_score)}`}>
                                {(source.relevance_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                          {message.sources.length > 3 && (
                            <div className="text-xs text-gray-400">
                              ... and {message.sources.length - 3} more sources
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* User message timestamp */}
                {message.type === 'user' && (
                  <div className="mt-2 text-xs text-blue-200">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[80%]">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin text-lg">🔄</div>
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '⏳' : '🚀'}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send • Max 1000 characters • Powered by OpenAI GPT-4o
        </div>
      </div>
    </div>
  );
}