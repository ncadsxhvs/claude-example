import { NextRequest, NextResponse } from 'next/server';
import { getDocumentChunks } from '../../../../../lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required', success: false },
        { status: 400 }
      );
    }

    const chunks = await getDocumentChunks(documentId);

    return NextResponse.json({
      success: true,
      chunks,
      count: chunks.length,
      documentId
    });

  } catch (error: any) {
    console.error('Chunks API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch chunks', 
        success: false,
        chunks: [],
        count: 0
      },
      { status: 500 }
    );
  }
}