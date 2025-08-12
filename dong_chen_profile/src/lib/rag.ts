// Simple RAG utilities for Phase 1
// Later phases will use proper vector embeddings

interface DocumentChunk {
  id: string;
  userId: string;
  fileName: string;
  text: string;
  chunkIndex: number;
}

interface DocumentWithChunks {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  textLength: number;
  chunksCount: number;
  status: string;
  chunks: string[];
}

interface SearchResult {
  chunk: string;
  fileName: string;
  score: number;
  chunkIndex: number;
}

// Simple text similarity function (Jaccard similarity)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Search for relevant document chunks based on user query
export function searchDocuments(query: string, userId: string, maxResults: number = 3): SearchResult[] {
  try {
    // Get user's documents from localStorage
    const storedDocs = localStorage.getItem('rag-documents');
    if (!storedDocs) {
      return [];
    }

    const allDocs: DocumentWithChunks[] = JSON.parse(storedDocs);
    const userDocs = allDocs.filter(doc => doc.userId === userId);

    if (userDocs.length === 0) {
      return [];
    }

    // Create searchable chunks
    const searchableChunks: DocumentChunk[] = [];
    userDocs.forEach(doc => {
      doc.chunks.forEach((chunk, index) => {
        searchableChunks.push({
          id: doc.id,
          userId: doc.userId,
          fileName: doc.fileName,
          text: chunk,
          chunkIndex: index
        });
      });
    });

    // Calculate similarity scores
    const results: SearchResult[] = searchableChunks
      .map(chunk => ({
        chunk: chunk.text,
        fileName: chunk.fileName,
        score: calculateSimilarity(query, chunk.text),
        chunkIndex: chunk.chunkIndex
      }))
      .filter(result => result.score > 0.1) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

// Enhanced prompt with document context
export function enhancePromptWithContext(userMessage: string, searchResults: SearchResult[]): string {
  if (searchResults.length === 0) {
    return userMessage;
  }

  const context = searchResults
    .map((result, index) => `[Document: ${result.fileName}, Chunk ${result.chunkIndex + 1}]\n${result.chunk}`)
    .join('\n\n---\n\n');

  return `Context from uploaded documents:
${context}

---

Based on the above context from the user's uploaded documents, please answer the following question. If the context is relevant, incorporate it into your response and mention which document you're referencing. If the context isn't relevant to the question, you can answer normally as Dong Chen.

User question: ${userMessage}`;
}

// Generate citations for the response
export function generateCitations(searchResults: SearchResult[]): string[] {
  return searchResults.map((result) => 
    `Based on your document "${result.fileName}" (section ${result.chunkIndex + 1})`
  );
}

// Check if user has uploaded documents
export function hasUploadedDocuments(userId: string): boolean {
  try {
    const storedDocs = localStorage.getItem('rag-documents');
    if (!storedDocs) return false;

    const allDocs: DocumentWithChunks[] = JSON.parse(storedDocs);
    return allDocs.some(doc => doc.userId === userId);
  } catch {
    return false;
  }
}

// Get user's document count
export function getUserDocumentCount(userId: string): number {
  try {
    const storedDocs = localStorage.getItem('rag-documents');
    if (!storedDocs) return 0;

    const allDocs: DocumentWithChunks[] = JSON.parse(storedDocs);
    return allDocs.filter(doc => doc.userId === userId).length;
  } catch {
    return 0;
  }
}