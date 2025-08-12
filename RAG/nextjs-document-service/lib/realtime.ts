/**
 * Real-time document processing system
 * Provides WebSocket-based updates during document processing
 */

import { EventEmitter } from 'events';

// Processing status types
export type ProcessingStatus = 
  | 'queued'
  | 'extracting_text'
  | 'chunking'
  | 'generating_embeddings'
  | 'storing_chunks'
  | 'completed'
  | 'failed';

export interface ProcessingUpdate {
  documentId: string;
  userId: string;
  filename: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  message: string;
  timestamp: Date;
  metadata?: {
    totalChunks?: number;
    processedChunks?: number;
    textLength?: number;
    error?: string;
  };
}

export interface ProcessingEventMap {
  'status_update': [ProcessingUpdate];
  'progress_update': [ProcessingUpdate];
  'completion': [ProcessingUpdate];
  'error': [ProcessingUpdate];
}

// Global processing event emitter
class ProcessingEventEmitter extends EventEmitter {
  // Store active processing jobs
  private activeJobs = new Map<string, ProcessingUpdate>();

  // Emit a processing update
  emitUpdate(update: ProcessingUpdate) {
    this.activeJobs.set(update.documentId, update);
    this.emit('status_update', update);
    
    if (update.status === 'completed' || update.status === 'failed') {
      this.emit('completion', update);
      this.activeJobs.delete(update.documentId);
    }

    if (update.status === 'failed') {
      this.emit('error', update);
    }
  }

  // Get current status of a job
  getJobStatus(documentId: string): ProcessingUpdate | undefined {
    return this.activeJobs.get(documentId);
  }

  // Get all active jobs for a user
  getUserJobs(userId: string): ProcessingUpdate[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.userId === userId);
  }

  // Clear job from active list
  clearJob(documentId: string) {
    this.activeJobs.delete(documentId);
  }
}

export const processingEmitter = new ProcessingEventEmitter();

// Processing tracker class for individual documents
export class DocumentProcessor {
  private documentId: string;
  private userId: string;
  private filename: string;
  private startTime: Date;

  constructor(documentId: string, userId: string, filename: string) {
    this.documentId = documentId;
    this.userId = userId;
    this.filename = filename;
    this.startTime = new Date();
  }

  // Update processing status
  updateStatus(status: ProcessingStatus, progress: number, message: string, metadata?: any) {
    const update: ProcessingUpdate = {
      documentId: this.documentId,
      userId: this.userId,
      filename: this.filename,
      status,
      progress,
      message,
      timestamp: new Date(),
      metadata
    };

    processingEmitter.emitUpdate(update);
  }

  // Mark as queued
  queued() {
    this.updateStatus('queued', 0, 'Document queued for processing');
  }

  // Mark as text extraction started
  extractingText(textLength?: number) {
    this.updateStatus('extracting_text', 10, 'Extracting text from document', {
      textLength
    });
  }

  // Mark as chunking started
  chunking(textLength: number) {
    this.updateStatus('chunking', 25, 'Breaking document into chunks', {
      textLength
    });
  }

  // Update chunking progress
  chunkingProgress(processedChunks: number, totalChunks: number) {
    const progress = 25 + Math.floor((processedChunks / totalChunks) * 30); // 25-55%
    this.updateStatus('chunking', progress, `Processed ${processedChunks}/${totalChunks} chunks`, {
      processedChunks,
      totalChunks
    });
  }

  // Mark as embedding generation started
  generatingEmbeddings(totalChunks: number) {
    this.updateStatus('generating_embeddings', 55, 'Generating embeddings with OpenAI', {
      totalChunks,
      processedChunks: 0
    });
  }

  // Update embedding progress
  embeddingProgress(processedChunks: number, totalChunks: number) {
    const progress = 55 + Math.floor((processedChunks / totalChunks) * 30); // 55-85%
    this.updateStatus('generating_embeddings', progress, `Generated embeddings for ${processedChunks}/${totalChunks} chunks`, {
      processedChunks,
      totalChunks
    });
  }

  // Mark as storing chunks
  storingChunks(totalChunks: number) {
    this.updateStatus('storing_chunks', 85, 'Storing chunks in vector database', {
      totalChunks
    });
  }

  // Mark as completed
  completed(totalChunks: number, textLength: number) {
    const processingTime = Date.now() - this.startTime.getTime();
    this.updateStatus('completed', 100, `Document processed successfully in ${Math.round(processingTime / 1000)}s`, {
      totalChunks,
      textLength,
      processingTimeMs: processingTime
    });
  }

  // Mark as failed
  failed(error: string) {
    const processingTime = Date.now() - this.startTime.getTime();
    this.updateStatus('failed', 0, `Processing failed: ${error}`, {
      error,
      processingTimeMs: processingTime
    });
  }
}

// WebSocket connection manager for real-time updates
export class RealtimeManager {
  private connections = new Map<string, Set<WebSocket>>();

  // Add a WebSocket connection for a user
  addConnection(userId: string, ws: WebSocket) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(ws);

    // Send current active jobs to the new connection
    const activeJobs = processingEmitter.getUserJobs(userId);
    if (activeJobs.length > 0) {
      this.sendToUser(userId, {
        type: 'active_jobs',
        data: activeJobs
      });
    }

    // Handle connection close
    ws.onclose = () => {
      this.removeConnection(userId, ws);
    };
  }

  // Remove a WebSocket connection
  removeConnection(userId: string, ws: WebSocket) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  // Send message to all connections for a user
  sendToUser(userId: string, message: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const messageStr = JSON.stringify(message);
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  // Send processing update to user
  sendProcessingUpdate(update: ProcessingUpdate) {
    this.sendToUser(update.userId, {
      type: 'processing_update',
      data: update
    });
  }

  // Get connection count for a user
  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0;
  }
}

// Global realtime manager instance
export const realtimeManager = new RealtimeManager();

// Set up event listeners
processingEmitter.on('status_update', (update: ProcessingUpdate) => {
  realtimeManager.sendProcessingUpdate(update);
});

// Utility function to create a document processor
export function createDocumentProcessor(documentId: string, userId: string, filename: string): DocumentProcessor {
  return new DocumentProcessor(documentId, userId, filename);
}