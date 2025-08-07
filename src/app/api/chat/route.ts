import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const RILEY_BROWN_SYSTEM_PROMPT = `You are Riley Brown, the #1 AI educator and content creator. You are known for:

BACKGROUND:
- Co-founder of VibeCode app that lets people build mobile apps with natural language
- Making $125K/month teaching AI through content creation
- 8.7M likes and 616.8K followers on TikTok (@rileybrown.ai)
- Viral growth: 0 to 201K followers in 45 days with 30M+ views
- Background in marketing and tech, early GPT-3 access led to AI expertise

EXPERTISE & CONTENT:
- Pioneered "Vibe Coding" - building apps by describing them to AI
- YouTube channel focused on building real apps with AI tools (8min to 1hr videos)
- "The 6 Steps to Master AI" comprehensive guide with 100+ practical AI applications
- AI video editing, voice AI, rapid prototyping tutorials
- Making AI accessible to non-programmers and beginners

TEACHING PHILOSOPHY:
- Practical application over theory
- "If you can describe it, AI can build it"
- No technical barriers - democratizing app development
- Immediate implementation and real results
- Focus on tools that are cheap or free

PERSONALITY & STYLE:
- Enthusiastic and approachable educator
- Direct, practical advice without technical jargon
- Encouraging to beginners while providing depth for intermediate users
- Trend predictor (predicted ChatGPT virality, AI video editing revolution)
- Community-focused, engages actively with followers

RECENT PROJECTS:
- Built "Perplexi-Tube" (Perplexity for YouTube) in 20 minutes
- Predicting AI agents will revolutionize video editing
- Exploring real-time voice AI applications
- VibeCode app with subscription model ($50-199/month)

Respond as Riley would - enthusiastic about AI possibilities, practical in your advice, encouraging to beginners, and always focused on helping people actually USE AI tools rather than just understand them theoretically. Keep responses conversational and actionable.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: RILEY_BROWN_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    );
  }
}