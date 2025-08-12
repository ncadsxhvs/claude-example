'use client';

import { useState, useEffect, useRef } from 'react';
import { ProcessingUpdate, ProcessingStatus as Status } from '@/lib/realtime';

interface ProcessingStatusProps {
  userId: string;
  onProcessingComplete?: (documentId: string) => void;
}

export default function ProcessingStatus({ userId, onProcessingComplete }: ProcessingStatusProps) {
  const [activeJobs, setActiveJobs] = useState<ProcessingUpdate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Connect to Server-Sent Events
    const connectSSE = () => {
      setConnectionStatus('connecting');
      
      const eventSource = new EventSource(`/api/realtime?userId=${userId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to real-time processing updates');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'processing_update') {
            const update: ProcessingUpdate = data.data;
            
            setActiveJobs(prev => {
              if (update.status === 'completed' || update.status === 'failed') {
                // Remove completed/failed jobs and notify parent
                if (update.status === 'completed' && onProcessingComplete) {
                  onProcessingComplete(update.documentId);
                }
                return prev.filter(job => job.documentId !== update.documentId);
              } else {
                // Update existing job or add new one
                const existingIndex = prev.findIndex(job => job.documentId === update.documentId);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = update;
                  return updated;
                } else {
                  return [...prev, update];
                }
              }
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            connectSSE();
          }
        }, 5000);
      };
    };

    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userId, onProcessingComplete]);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'queued': return 'bg-gray-100 text-gray-800';
      case 'extracting_text': return 'bg-blue-100 text-blue-800';
      case 'chunking': return 'bg-yellow-100 text-yellow-800';
      case 'generating_embeddings': return 'bg-purple-100 text-purple-800';
      case 'storing_chunks': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'queued': return '⏳';
      case 'extracting_text': return '📄';
      case 'chunking': return '✂️';
      case 'generating_embeddings': return '🧠';
      case 'storing_chunks': return '💾';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⚙️';
    }
  };

  const formatStatus = (status: Status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (activeJobs.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Connection Status */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
        connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
        'bg-red-100 text-red-700'
      }`}>
        {connectionStatus === 'connected' && '🟢'} 
        {connectionStatus === 'connecting' && '🟡'} 
        {connectionStatus === 'disconnected' && '🔴'} 
        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
      </div>

      {/* Processing Jobs */}
      {activeJobs.map((job) => (
        <div
          key={job.documentId}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getStatusIcon(job.status)}</span>
                <div>
                  <p className="font-medium text-gray-900 truncate">{job.filename}</p>
                  <p className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(job.status)}`}>
                    {formatStatus(job.status)}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{job.message}</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{job.progress}%</span>
                <span>{new Date(job.timestamp).toLocaleTimeString()}</span>
              </div>

              {/* Metadata */}
              {job.metadata && (
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  {job.metadata.totalChunks && (
                    <div>Total chunks: {job.metadata.totalChunks}</div>
                  )}
                  {job.metadata.processedChunks !== undefined && (
                    <div>Processed: {job.metadata.processedChunks}/{job.metadata.totalChunks}</div>
                  )}
                  {job.metadata.textLength && (
                    <div>Text length: {job.metadata.textLength.toLocaleString()} chars</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}