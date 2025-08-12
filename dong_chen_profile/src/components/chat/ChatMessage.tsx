'use client';

import { ChatMessage as ChatMessageType } from '@/types';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useAuth();
  const isUser = message.role === 'user';
  const isDong = message.role === 'assistant';

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isDong && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className={`text-xs text-gray-500 mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {isUser ? (user?.displayName || 'You') : 'Dong Chen'}
        </div>
        
        <div className={`px-4 py-3 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        
        <div className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {isUser && user?.photoURL && (
        <div className="flex-shrink-0">
          <Image
            src={user.photoURL}
            alt="Your profile"
            width={40}
            height={40}
            className="rounded-full border-2 border-gray-200"
          />
        </div>
      )}
    </div>
  );
}