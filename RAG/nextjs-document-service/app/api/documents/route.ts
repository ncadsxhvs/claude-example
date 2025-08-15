import { NextRequest, NextResponse } from 'next/server';
import { getUserDocuments } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    const documents = await getUserDocuments(userId);

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error: any) {
    console.error('Documents API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch documents', 
        success: false,
        documents: [],
        count: 0
      },
      { status: 500 }
    );
  }
}