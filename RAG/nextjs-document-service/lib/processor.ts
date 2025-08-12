import MarkdownIt from 'markdown-it';
import { randomBytes } from 'crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const md = new MarkdownIt();

export interface DocumentChunk {
  id: string;
  text: string;
  index: number;
  wordCount: number;
  characterCount: number;
}

export interface ProcessingResult {
  success: boolean;
  document?: {
    id: string;
    filename: string;
    size: number;
    textLength: number;
    chunksCount: number;
    processedAt: string;
  };
  chunks?: DocumentChunk[];
  preview?: string;
  error?: string;
}

export interface ProcessingOptions {
  chunkSize?: number;
  overlap?: number;
}

// Process file content
export async function processFileContent(buffer: Buffer, filename: string): Promise<string> {
  let text = buffer.toString('utf-8');
  
  // Convert markdown to text if needed
  if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
    const tokens = md.parse(text, {});
    text = extractTextFromTokens(tokens);
  }
  
  // Clean text
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract text from markdown tokens
function extractTextFromTokens(tokens: any[]): string {
  let text = '';
  
  for (const token of tokens) {
    if (token.type === 'heading_open') {
      text += '\n\n';
    } else if (token.type === 'heading_close') {
      text += '\n\n';
    } else if (token.type === 'paragraph_open') {
      text += '\n';
    } else if (token.type === 'paragraph_close') {
      text += '\n';
    } else if (token.type === 'list_item_open') {
      text += '\n• ';
    } else if (token.type === 'list_item_close') {
      text += '\n';
    } else if (token.type === 'code_block' || token.type === 'fence') {
      text += '\n\n' + token.content + '\n\n';
    } else if (token.type === 'inline') {
      text += token.content;
    } else if (token.children) {
      text += extractTextFromTokens(token.children);
    }
  }
  
  return text;
}

// Chunk text using RecursiveCharacterTextSplitter
export async function chunkText(text: string, options: ProcessingOptions = {}): Promise<DocumentChunk[]> {
  const chunkSize = options.chunkSize || 1000;
  const overlap = options.overlap || 200;
  
  // Initialize RecursiveCharacterTextSplitter with medical/real estate friendly separators
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: overlap,
    separators: [
      // Medical/legal document separators (higher priority)
      '\n## ',     // Section headers
      '\n# ',      // Main headers
      '\n\n',      // Paragraph breaks
      '\n',        // Line breaks
      '. ',        // Sentence endings
      ', ',        // Clause separators
      ' ',         // Word boundaries
      ''           // Character level (fallback)
    ],
  });

  // Split the text
  const textChunks = await textSplitter.splitText(text);
  
  // Convert to DocumentChunk format
  const chunks: DocumentChunk[] = textChunks.map((chunkText: string, index: number) => ({
    id: generateId(),
    text: chunkText.trim(),
    index: index,
    wordCount: chunkText.split(/\s+/).filter((w: string) => w.length > 0).length,
    characterCount: chunkText.length
  })).filter((chunk: DocumentChunk) => chunk.text.length > 0);

  return chunks;
}

// Generate preview
export function generatePreview(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Generate ID
function generateId(): string {
  return randomBytes(8).toString('hex');
}

// Validate file
export function validateFile(buffer: Buffer, filename: string): { isValid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = ['.txt', '.md', '.markdown'];
  
  if (buffer.length > maxSize) {
    return { isValid: false, error: 'File too large (max 10MB)' };
  }
  
  if (buffer.length === 0) {
    return { isValid: false, error: 'File is empty' };
  }
  
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return { isValid: false, error: 'Only .txt, .md, .markdown files allowed' };
  }
  
  return { isValid: true };
}