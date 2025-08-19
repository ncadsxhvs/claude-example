/**
 * OpenAI Chat Completion wrapper for RAG-enhanced question answering
 */

interface SearchResult {
  chunk_id: string;
  document_name: string;
  text: string;
  similarity_score?: number;
  page?: number;
  chunk_index?: number;
}

interface ChatResponse {
  answer: string;
  sources: {
    chunk_id: string;
    document: string;
    page?: number;
    relevance_score?: number;
    text_preview: string;
  }[];
  search_results_count: number;
  tokens_used: number;
  model_used: string;
}

interface ChatRequest {
  question: string;
  searchResults: SearchResult[];
  userId: string;
}

/**
 * Generate AI response using OpenAI with RAG context
 */
export async function generateChatResponse(request: ChatRequest): Promise<ChatResponse> {
  const { question, searchResults, userId } = request;
  
  // Prepare context from search results
  const context = formatContextFromResults(searchResults);
  
  // Build the prompt
  const prompt = buildRAGPrompt(question, context, searchResults);
  
  // Try GPT-4o (latest) first, fallback to GPT-4, then GPT-3.5-turbo
  const models = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  let modelUsed = '';
  let answer = '';
  let tokensUsed = 0;
  
  for (const model of models) {
    try {
      const response = await callOpenAI(prompt, model);
      answer = response.answer;
      tokensUsed = response.tokensUsed;
      modelUsed = model;
      break;
    } catch (error) {
      console.warn(`Failed to use model ${model}:`, error);
      // Continue to next model
      if (model === models[models.length - 1]) {
        throw new Error(`All OpenAI models failed. Last error: ${error}`);
      }
    }
  }
  
  // Format sources with citations
  const sources = searchResults.map((result, index) => ({
    chunk_id: result.chunk_id,
    document: result.document_name,
    page: result.page,
    relevance_score: result.similarity_score,
    text_preview: result.text.substring(0, 150) + (result.text.length > 150 ? '...' : '')
  }));
  
  return {
    answer,
    sources,
    search_results_count: searchResults.length,
    tokens_used: tokensUsed,
    model_used: modelUsed
  };
}

/**
 * Format search results into context for AI
 */
function formatContextFromResults(results: SearchResult[]): string {
  return results.map((result, index) => {
    const sourceId = `[${index + 1}]`;
    const pageInfo = result.page ? ` (Page ${result.page})` : '';
    const docInfo = `${result.document_name}${pageInfo}`;
    
    return `${sourceId} Source: ${docInfo}
Content: ${result.text}`;
  }).join('\n\n');
}

/**
 * Build RAG-enhanced prompt for OpenAI
 */
function buildRAGPrompt(question: string, context: string, results: SearchResult[]): string {
  const sourceList = results.map((result, index) => {
    const pageInfo = result.page ? ` (Page ${result.page})` : '';
    return `[${index + 1}] ${result.document_name}${pageInfo}`;
  }).join('\n');
  
  return `You are a helpful AI assistant that answers questions based on provided document contexts. Your task is to provide accurate, comprehensive answers using ONLY the information from the given sources.

IMPORTANT INSTRUCTIONS:
1. Answer the question using ONLY information from the provided contexts
2. ALWAYS include citations using the source numbers [1], [2], etc.
3. If information spans multiple sources, cite all relevant sources
4. If the question cannot be answered from the provided context, clearly state this
5. Be comprehensive but concise
6. When citing, include page numbers when available

AVAILABLE SOURCES:
${sourceList}

CONTEXT DOCUMENTS:
${context}

QUESTION: ${question}

Please provide a comprehensive answer with proper citations:`;
}

/**
 * Call OpenAI API with retry logic
 */
async function callOpenAI(prompt: string, model: string): Promise<{ answer: string; tokensUsed: number }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1, // Low temperature for factual responses
          top_p: 0.95,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }
      
      const answer = data.choices[0].message.content.trim();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      return { answer, tokensUsed };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        console.warn(`Attempt ${attempt} failed for model ${model}, retrying in ${delay}ms...`);
      }
    }
  }
  
  throw lastError || new Error('Unknown error occurred');
}

/**
 * Validate chat request parameters
 */
export function validateChatRequest(body: any): {
  isValid: boolean;
  error?: string;
  data?: {
    question: string;
    userId: string;
    searchMode?: string;
    maxResults?: number;
    similarityThreshold?: number;
  };
} {
  if (!body) {
    return { isValid: false, error: 'Request body is required' };
  }
  
  if (!body.question || typeof body.question !== 'string') {
    return { isValid: false, error: 'Question is required and must be a string' };
  }
  
  if (body.question.trim().length === 0) {
    return { isValid: false, error: 'Question cannot be empty' };
  }
  
  if (body.question.length > 1000) {
    return { isValid: false, error: 'Question is too long (max 1000 characters)' };
  }
  
  const userId = body.userId || 'demo-user';
  const searchMode = body.searchMode || 'hybrid';
  const maxResults = Math.min(body.maxResults || 10, 20); // Cap at 20 for token limits
  const similarityThreshold = body.similarityThreshold || 0.3;
  
  // Validate search mode
  const validSearchModes = ['semantic', 'keyword', 'hybrid', 'medical_tables'];
  if (!validSearchModes.includes(searchMode)) {
    return { isValid: false, error: `Invalid search mode. Must be one of: ${validSearchModes.join(', ')}` };
  }
  
  return {
    isValid: true,
    data: {
      question: body.question.trim(),
      userId,
      searchMode,
      maxResults,
      similarityThreshold
    }
  };
}