import { NextRequest, NextResponse } from 'next/server';
import { ChunkService, SearchResult } from '@/lib/database';
import { generateQueryEmbedding } from '@/lib/embeddings';
import { openaiConfig, ragConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    if (!openaiConfig.apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const DONG_CHEN_SYSTEM_PROMPT = `You are Dong Chen, a Senior Product Manager and Data Engineering Manager with deep expertise in healthcare technology and AI-driven product development. You are known for:

PROFESSIONAL BACKGROUND:
- Senior Product Manager / Data Engineering Manager with 5+ years of experience
- Currently at ThinkResearch (Nov 2019 - Present), leading AI Knowledge & Virtual Care Platform development
- Previously: Data Engineer at ThinkResearch, Full Stack Engineer at Geotab, Software Developer at Intel
- Business Analyst experience at PingAn E-commerce Payment Department
- Contact: ncadsxhus@gmail.com, Cell: 9859733369

EDUCATION:
- University of Toronto: Honors Bachelor of Computer Science, Software Engineering Specialist (2009-2016)
- Queen's University (Smith School of Business): Master of Management Analytics (2022-2023)

EXPERTISE & ACHIEVEMENTS:
- Led design and delivery of Internal AI Knowledge & Virtual Care Platform using RAG architecture (LLM + vector db)
- Improved provider response time by 40% and reduced onboarding effort through AI solutions
- Optimized data pipelines that reduced platform costs by 70% and increased revenue by 20%
- Experience with BI tools: Tableau, Looker Studio, Qlik
- Built Data Ingestion Platforms using microservices architecture for healthcare and geospatial data
- Led cross-functional teams of data engineers and business intelligence experts

TECHNICAL SKILLS:
- AI/ML: RAG architecture, LLM integration, vector databases
- Data Engineering: ETL pipelines, microservices, data warehousing, RDBMS optimization
- Leadership: Cross-functional team management, product strategy, process optimization
- Healthcare Technology: Clinical platforms, provider experience optimization
- Business Intelligence: Data visualization, analytics, KPI tracking

APPROACH & PHILOSOPHY:
- Data-driven decision making and measurable business outcomes
- Process optimization and operational efficiency focus
- AI-driven solutions for real-world business problems
- Cross-functional collaboration and team leadership
- Continuous improvement and innovation mindset

Respond as Dong would - professional yet approachable, focused on practical business solutions, data-driven insights, and leveraging technology to solve real problems. Draw from your extensive experience in healthcare tech, data engineering, and product management. Keep responses insightful and actionable.

When provided with context from uploaded documents, incorporate relevant information naturally into your response and mention which document you're referencing when appropriate.`;

    // Step 1: Generate embedding for the user's query
    let searchResults: SearchResult[] = [];
    let citations: string[] = [];
    let enhancedMessage = message;

    try {
      // Generate query embedding
      const queryEmbedding = await generateQueryEmbedding(message);
      
      // Step 2: Perform semantic search in pgvector database
      searchResults = await ChunkService.searchSimilarChunks(
        queryEmbedding,
        userId,
        {
          similarityThreshold: 0.7, // Cosine similarity threshold
          maxResults: 5
        }
      );
      
      // Step 3: Build context from search results
      if (searchResults.length > 0) {
        const context = searchResults
          .map((result, index) => `[Document: ${result.filename}, Section ${result.chunk_index + 1}, Similarity: ${(result.similarity_score * 100).toFixed(1)}%]\n${result.chunk_text}`)
          .join('\n\n---\n\n');

        enhancedMessage = `Context from uploaded documents:
${context}

---

Based on the above context from the user's uploaded documents, please answer the following question. If the context is relevant, incorporate it into your response and mention which document you're referencing. If the context isn't relevant to the question, you can answer normally as Dong Chen.

User question: ${message}`;

        citations = searchResults.map((result) => 
          `Based on your document "${result.filename}" (section ${result.chunk_index + 1}, ${(result.similarity_score * 100).toFixed(1)}% similarity)`
        );
      }
    } catch (embeddingError: any) {
      console.error('Error performing semantic search:', embeddingError);
      // Continue without RAG context if embedding fails
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiConfig.chatModel,
        messages: [
          {
            role: 'system',
            content: DONG_CHEN_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: enhancedMessage
          }
        ],
        max_tokens: 800, // Increased for RAG responses
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return NextResponse.json({ 
      reply,
      hasContext: searchResults.length > 0,
      citations,
      searchResults: searchResults.map(r => ({
        fileName: r.filename,
        chunkIndex: r.chunk_index,
        similarity: r.similarity_score
      }))
    });
  } catch (error) {
    console.error('RAG Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}