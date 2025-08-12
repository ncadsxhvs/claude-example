'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChatMessage as ChatMessageType } from '@/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import DocumentUpload from '../documents/DocumentUpload';
import DocumentList from '../documents/DocumentList';

const STORAGE_KEY = 'dong-chat-messages';

interface DocumentWithChunks {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  textLength: number;
  chunksCount: number;
  status: string;
  chunks: string[];
}

interface RAGChatMessage extends ChatMessageType {
  hasContext?: boolean;
  citations?: string[];
  searchResults?: {
    fileName: string;
    chunkIndex: number;
    score: number;
  }[];
}

export default function RAGChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RAGChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [userDocuments, setUserDocuments] = useState<DocumentWithChunks[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (err) {
        console.error('Error parsing saved messages:', err);
      }
    }
  }, []);

  // Load user documents
  useEffect(() => {
    if (user) {
      loadUserDocuments();
    } else {
      setUserDocuments([]);
    }
  }, [user]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserDocuments = async () => {
    if (!user) return;
    
    try {
      // In Phase 2, we could fetch user document count from database
      // For now, we'll assume documents exist if we can successfully call the API
      setUserDocuments([]); // Not needed for Phase 2 since we search database directly
    } catch (error) {
      console.error('Error loading user documents:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!user) {
      setError('Please sign in to chat with Dong');
      return;
    }

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: RAGChatMessage = {
      role: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Always use RAG-enhanced API in Phase 2 (searches database automatically)
      const response = await fetch('/api/chat-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add Dong's response
      const dongMessage: RAGChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        hasContext: data.hasContext,
        citations: data.citations,
        searchResults: data.searchResults
      };

      setMessages(prev => [...prev, dongMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response from Dong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
  };

  const handleDocumentUploaded = () => {
    loadUserDocuments();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4">
            D
          </div>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Chat with Dong Chen</h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Sign in to start chatting with Dong about product management, data engineering, and AI-driven solutions.
        </p>
        <div className="text-sm text-gray-500">
          Please sign in above to continue
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[80vh] flex bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Documents Sidebar */}
      {showDocuments && (
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Documents</h3>
              <button
                onClick={() => setShowDocuments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
            </div>
            <DocumentList />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              D
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Dong Chen</h3>
              <p className="text-xs text-gray-500">
                Senior Product Manager • Data Engineering Manager
                {userDocuments.length > 0 && (
                  <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    RAG Enabled ({userDocuments.length} docs)
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className={`p-2 rounded-lg transition-colors ${
                showDocuments 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle documents"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
                title="Clear chat history"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                D
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Hey there! 👋</h4>
              <p className="text-gray-600 max-w-md mx-auto mb-4">
                I'm Dong Chen, and I'm here to help you with product management, data engineering, and AI-driven solutions. 
                Ask me anything about healthcare technology, data pipelines, or building scalable platforms!
              </p>
              {userDocuments.length === 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Upload your documents to get personalized answers based on your content!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={index}>
                  <ChatMessage message={message} />
                  {message.hasContext && message.citations && (
                    <div className="mt-2 ml-12 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                      <div className="font-medium mb-1">📄 Sources:</div>
                      {message.citations.map((citation, idx) => (
                        <div key={idx} className="truncate">{citation}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                D
              </div>
              <div className="flex flex-col items-start">
                <div className="text-xs text-gray-500 mb-1">Dong Chen</div>
                <div className="bg-gray-100 border border-gray-200 px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {userDocuments.length > 0 ? 'Dong is analyzing your documents...' : 'Dong is thinking...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask Dong about your documents, or anything else..."
        />
      </div>
    </div>
  );
}