import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ragConfig } from './config';

interface PageInfo {
  start: number;
  end: number;
  page: number;
}

interface TableBoundary {
  start: number;
  end: number;
  isTable: boolean;
}

interface ChunkResult {
  content: string;
  metadata: {
    pageNumbers: number[];
    isTable?: boolean;
    chunkSize: number;
  };
}

/**
 * Enhanced text splitter that preserves page boundaries and table structures
 */
export class PageAwareChunker {
  private textSplitter: RecursiveCharacterTextSplitter;
  private config = ragConfig;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: this.getSmartSeparators(),
    });
  }

  /**
   * Smart separators prioritizing page boundaries and table structures
   */
  private getSmartSeparators(): string[] {
    if (this.config.pageAwareChunking) {
      return [
        // Page boundaries (highest priority)
        '\n# Page ',
        '\n--- Page ',
        '--- Page ',
        '\f',  // Form feed (page break)
        
        // Table boundaries (second priority)
        '\n<table>',
        '</table>\n',
        '\n</table>',
        
        // Section headers (medical/legal documents)
        '\n## ',
        '\n# ',
        
        // Paragraph and content breaks
        '\n\n',
        '\n',
        
        // Sentence and clause boundaries
        '. ',
        ', ',
        ' ',
        ''  // Character level fallback
      ];
    }
    
    // Original separators for backward compatibility
    return [
      '\n## ',
      '\n# ',
      '\n\n',
      '\n',
      '. ',
      ', ',
      ' ',
      ''
    ];
  }

  /**
   * Detect table boundaries in text using various patterns
   */
  private detectTableBoundaries(text: string): TableBoundary[] {
    const boundaries: TableBoundary[] = [];
    
    if (!this.config.tableDetectionEnabled) {
      return boundaries;
    }

    // HTML table detection
    const htmlTableRegex = /<table[\s\S]*?<\/table>/gi;
    let match;
    while ((match = htmlTableRegex.exec(text)) !== null) {
      boundaries.push({
        start: match.index,
        end: match.index + match[0].length,
        isTable: true
      });
    }

    // Markdown table detection (pipe-separated)
    const lines = text.split('\n');
    let currentTableStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line looks like a table row (contains multiple |)
      const pipeCount = (line.match(/\|/g) || []).length;
      
      if (pipeCount >= 2) {
        // Start of table or continuation
        if (currentTableStart === -1) {
          currentTableStart = text.indexOf(lines[i]);
        }
      } else {
        // End of table if we were in one
        if (currentTableStart !== -1) {
          const tableEnd = text.indexOf(lines[i - 1]) + lines[i - 1].length;
          boundaries.push({
            start: currentTableStart,
            end: tableEnd,
            isTable: true
          });
          currentTableStart = -1;
        }
      }
    }

    // Handle table that ends at the end of text
    if (currentTableStart !== -1) {
      boundaries.push({
        start: currentTableStart,
        end: text.length,
        isTable: true
      });
    }

    return boundaries.sort((a, b) => a.start - b.start);
  }

  /**
   * Check if a chunk spans across page boundaries
   */
  private getChunkPages(chunkStart: number, chunkEnd: number, pageMap?: Map<number, PageInfo>): number[] {
    if (!pageMap) return [];

    const pages: number[] = [];
    Array.from(pageMap.values()).forEach(pageInfo => {
      if (chunkStart <= pageInfo.end && chunkEnd >= pageInfo.start) {
        if (!pages.includes(pageInfo.page)) {
          pages.push(pageInfo.page);
        }
      }
    });
    return pages.sort((a, b) => a - b);
  }

  /**
   * Smart chunking that preserves page boundaries and table structures
   */
  async chunkText(
    text: string, 
    pageMap?: Map<number, PageInfo>
  ): Promise<ChunkResult[]> {
    
    // If page-aware chunking is disabled, use standard chunking
    if (!this.config.pageAwareChunking) {
      const chunks = await this.textSplitter.splitText(text);
      return chunks.map(chunk => ({
        content: chunk,
        metadata: {
          pageNumbers: [],
          chunkSize: chunk.length
        }
      }));
    }

    const tableBoundaries = this.detectTableBoundaries(text);
    const results: ChunkResult[] = [];
    
    // If we have page boundaries and preserve boundaries is enabled
    if (this.config.preservePageBoundaries && pageMap && pageMap.size > 0) {
      // Process each page separately
      for (const pageInfo of Array.from(pageMap.values())) {
        const pageText = text.substring(pageInfo.start, pageInfo.end);
        const pageTableBoundaries = tableBoundaries.filter(
          table => table.start >= pageInfo.start && table.end <= pageInfo.end
        );
        
        const pageResults = await this.chunkPageText(
          pageText, 
          pageInfo.page, 
          pageTableBoundaries.map(table => ({
            start: table.start - pageInfo.start,
            end: table.end - pageInfo.start,
            isTable: table.isTable
          }))
        );
        
        results.push(...pageResults);
      }
    } else {
      // Process entire text with table awareness
      const chunks = await this.processWithTableAwareness(text, tableBoundaries);
      
      for (const chunk of chunks) {
        const chunkStart = text.indexOf(chunk.content);
        const chunkEnd = chunkStart + chunk.content.length;
        const pageNumbers = this.getChunkPages(chunkStart, chunkEnd, pageMap);
        
        results.push({
          content: chunk.content,
          metadata: {
            pageNumbers,
            isTable: chunk.isTable,
            chunkSize: chunk.content.length
          }
        });
      }
    }

    return results;
  }

  /**
   * Process a single page with table awareness
   */
  private async chunkPageText(
    pageText: string, 
    pageNumber: number, 
    tableBoundaries: TableBoundary[]
  ): Promise<ChunkResult[]> {
    
    if (tableBoundaries.length === 0) {
      // No tables, use standard chunking
      const chunks = await this.textSplitter.splitText(pageText);
      return chunks.map(chunk => ({
        content: chunk,
        metadata: {
          pageNumbers: [pageNumber],
          chunkSize: chunk.length
        }
      }));
    }

    const results: ChunkResult[] = [];
    let lastEnd = 0;

    for (const table of tableBoundaries) {
      // Process text before the table
      if (table.start > lastEnd) {
        const beforeTableText = pageText.substring(lastEnd, table.start);
        const beforeChunks = await this.textSplitter.splitText(beforeTableText);
        
        for (const chunk of beforeChunks) {
          results.push({
            content: chunk,
            metadata: {
              pageNumbers: [pageNumber],
              chunkSize: chunk.length
            }
          });
        }
      }

      // Process the table as a single chunk if it fits, otherwise split smartly
      const tableText = pageText.substring(table.start, table.end);
      
      if (tableText.length <= this.config.maxChunkSizeForTables) {
        // Keep table intact
        results.push({
          content: tableText,
          metadata: {
            pageNumbers: [pageNumber],
            isTable: true,
            chunkSize: tableText.length
          }
        });
      } else {
        // Split large table carefully
        const tableSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: this.config.maxChunkSizeForTables,
          chunkOverlap: this.config.chunkOverlap,
          separators: ['\n<tr>', '</tr>\n', '\n</tr>', '\n|', '|', '\n', ' ', '']
        });
        
        const tableChunks = await tableSplitter.splitText(tableText);
        for (const chunk of tableChunks) {
          results.push({
            content: chunk,
            metadata: {
              pageNumbers: [pageNumber],
              isTable: true,
              chunkSize: chunk.length
            }
          });
        }
      }

      lastEnd = table.end;
    }

    // Process remaining text after the last table
    if (lastEnd < pageText.length) {
      const afterTableText = pageText.substring(lastEnd);
      const afterChunks = await this.textSplitter.splitText(afterTableText);
      
      for (const chunk of afterChunks) {
        results.push({
          content: chunk,
          metadata: {
            pageNumbers: [pageNumber],
            chunkSize: chunk.length
          }
        });
      }
    }

    return results;
  }

  /**
   * Process text with table awareness but without strict page boundaries
   */
  private async processWithTableAwareness(
    text: string, 
    tableBoundaries: TableBoundary[]
  ): Promise<Array<{ content: string; isTable?: boolean }>> {
    
    if (tableBoundaries.length === 0) {
      const chunks = await this.textSplitter.splitText(text);
      return chunks.map(chunk => ({ content: chunk }));
    }

    const results: Array<{ content: string; isTable?: boolean }> = [];
    let lastEnd = 0;

    for (const table of tableBoundaries) {
      // Process text before the table
      if (table.start > lastEnd) {
        const beforeTableText = text.substring(lastEnd, table.start);
        const beforeChunks = await this.textSplitter.splitText(beforeTableText);
        results.push(...beforeChunks.map(chunk => ({ content: chunk })));
      }

      // Process the table
      const tableText = text.substring(table.start, table.end);
      
      if (tableText.length <= this.config.maxChunkSizeForTables) {
        results.push({ content: tableText, isTable: true });
      } else {
        // Split large table
        const tableSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: this.config.maxChunkSizeForTables,
          chunkOverlap: this.config.chunkOverlap,
          separators: ['\n<tr>', '</tr>\n', '\n</tr>', '\n|', '|', '\n', ' ', '']
        });
        
        const tableChunks = await tableSplitter.splitText(tableText);
        results.push(...tableChunks.map(chunk => ({ content: chunk, isTable: true })));
      }

      lastEnd = table.end;
    }

    // Process remaining text
    if (lastEnd < text.length) {
      const afterTableText = text.substring(lastEnd);
      const afterChunks = await this.textSplitter.splitText(afterTableText);
      results.push(...afterChunks.map(chunk => ({ content: chunk })));
    }

    return results;
  }
}

export const pageAwareChunker = new PageAwareChunker();