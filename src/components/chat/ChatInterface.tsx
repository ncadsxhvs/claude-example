'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChatMessage as ChatMessageType } from '@/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const STORAGE_KEY = 'dong-chat-messages';

export default function ChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    const userMessage: ChatMessageType = {
      role: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
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

      // Add Riley's response
      const rileyMessage: ChatMessageType = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, rileyMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get response from Riley. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
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
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            D
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Dong Chen</h3>
            <p className="text-xs text-gray-500">Senior Product Manager • Data Engineering Manager</p>
          </div>
        </div>
        
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              D
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Hey there! 👋</h4>
            <p className="text-gray-600 max-w-md mx-auto">
              I'm Dong Chen, and I'm here to help you with product management, data engineering, and AI-driven solutions. 
              Ask me anything about healthcare technology, data pipelines, or building scalable platforms!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
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
                  <span className="text-sm text-gray-500">Dong is thinking...</span>
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
        placeholder="Ask Riley about AI, coding, or building apps..."
      />
    </div>
  );
}