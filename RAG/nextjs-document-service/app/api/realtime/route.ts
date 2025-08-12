/**
 * WebSocket endpoint for real-time document processing updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { realtimeManager } from '@/lib/realtime';

// For development/testing - in production, use proper WebSocket server
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // For now, return connection info
  // In production, this would upgrade to WebSocket
  return NextResponse.json({
    message: 'WebSocket endpoint ready',
    userId,
    activeConnections: realtimeManager.getUserConnectionCount(userId),
    endpoint: `/api/realtime?userId=${userId}`
  });
}

// Server-Sent Events alternative for real-time updates
export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Return Server-Sent Events response
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          userId
        })}\n\n`)
      );

      // Set up processing event listener
      const handleUpdate = (update: any) => {
        if (update.userId === userId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'processing_update',
              data: update
            })}\n\n`)
          );
        }
      };

      // Listen for processing updates
      const { processingEmitter } = require('@/lib/realtime');
      processingEmitter.on('status_update', handleUpdate);

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`)
        );
      }, 30000); // Every 30 seconds

      // Clean up on close
      request.signal?.addEventListener('abort', () => {
        processingEmitter.off('status_update', handleUpdate);
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}