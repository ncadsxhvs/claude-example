'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChatMessage } from '@/types';

export default function ChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hey there! I'm Riley Brown, and I'm excited to chat with you about AI! Whether you're curious about vibe coding, want to know about building apps with AI, or just want to explore what's possible with these amazing tools - I'm here to help. What's on your mind?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      const savedMessages = localStorage.getItem(`chat_history_${user.uid}`);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (parsed.length > 1) { // Keep initial message
          setMessages(parsed);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && messages.length > 1) {
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(messages));
    }
  }, [messages, user]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          userId: user?.uid
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again!",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[70vh] flex flex-col rounded-xl overflow-hidden border border-gray-200">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-black/[0.01]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 max-w-[80%] ${
              message.role === 'user' ? 'self-end flex-row-reverse' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
              {message.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div
              className={`px-4 py-3 rounded-2xl shadow-sm border ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-200'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
              🤖
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Riley about AI, vibe coding, or anything else..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-3xl font-inherit text-sm resize-none min-h-[20px] max-h-[120px] leading-relaxed focus:outline-none focus:border-blue-600"
            maxLength={500}
            disabled={isLoading}
            rows={1}
            style={{ height: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-5 py-3 rounded-3xl font-medium text-sm transition-all duration-300 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
        <div className="mt-2 text-center">
          <small className="text-gray-500 text-xs">
            Chat powered by AI • Be respectful and constructive
          </small>
        </div>
      </div>
    </div>
  );
}