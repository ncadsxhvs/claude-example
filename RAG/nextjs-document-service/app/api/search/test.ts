import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Search test works' });
}

export async function GET() {
  return NextResponse.json({ message: 'Search test GET works' });
}