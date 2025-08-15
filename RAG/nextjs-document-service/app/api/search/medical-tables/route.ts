import { NextRequest, NextResponse } from 'next/server';
import { searchMedicalTables } from '../../../../lib/medical-table-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId = 'demo-user', tableType, limit = 10, similarityThreshold = 0.3 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Search medical tables
    const results = await searchMedicalTables(query, userId, {
      tableType,
      limit,
      similarityThreshold
    });

    return NextResponse.json({
      success: true,
      query,
      results: results.map(result => ({
        tableId: result.table_id,
        documentId: result.document_id,
        filename: result.filename,
        tableIndex: result.table_index,
        tableType: result.table_type,
        headers: result.headers,
        similarityScore: parseFloat(result.similarity_score),
        searchableText: result.searchable_text,
        rawData: JSON.parse(result.raw_data),
        confidence: parseFloat(result.confidence_score)
      })),
      totalResults: results.length,
      searchType: 'medical_tables'
    });

  } catch (error: any) {
    console.error('Medical table search error:', error);
    return NextResponse.json(
      { error: 'Failed to search medical tables', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Medical Table Search API',
    methods: ['POST'],
    endpoint: '/api/search/medical-tables',
    description: 'Search through extracted medical tables using semantic and keyword matching',
    parameters: {
      query: 'string (required) - search query',
      userId: 'string (optional) - user ID filter',
      tableType: 'string (optional) - filter by table type (lab_results, vital_signs, medication, general)',
      limit: 'number (optional) - max results (default: 10)',
      similarityThreshold: 'number (optional) - minimum similarity score (default: 0.3)'
    }
  });
}