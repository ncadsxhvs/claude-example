# Next.js Document Processing Service

A minimalist document processing service built with Next.js for intelligent text chunking and RAG applications.

## Features

- 📄 **Document Processing**: Upload and process .txt, .md, .markdown files
- 🧬 **Medical Content Aware**: Preserves complex medical terminology (β-cells, A1C ≥6.5%, HNF-1α)
- 🔄 **Semantic Chunking**: Intelligent text splitting with configurable overlap
- 🎨 **Minimalist UI**: Clean drag-and-drop interface with real-time feedback
- 🚀 **Fast**: Server-side processing with Next.js API routes
- 📱 **Responsive**: Works on desktop and mobile devices

## Quick Start

### Development Mode
```bash
./start.sh
```

### Production Mode
```bash
./start-prod.sh
```

### Manual Start
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm run start
```

## API Endpoints

### Upload Document
```bash
POST /api/upload
Content-Type: multipart/form-data

# Parameters:
# - file: Document file (.txt, .md, .markdown)
# - chunkSize: Chunk size in characters (default: 1000)
# - overlap: Overlap between chunks (default: 200)
```

### Health Check
```bash
GET /api/health
```

## Example Usage

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('chunkSize', '1000');
formData.append('overlap', '200');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.chunks); // Array of document chunks
```

## Response Format

```json
{
  "success": true,
  "document": {
    "id": "unique-id",
    "filename": "document.md",
    "size": 12345,
    "textLength": 10000,
    "chunksCount": 12,
    "processedAt": "2024-01-01T00:00:00.000Z"
  },
  "chunks": [
    {
      "id": "chunk-id",
      "text": "Document content...",
      "index": 0,
      "wordCount": 150,
      "characterCount": 800
    }
  ],
  "preview": "First 500 characters of the document..."
}
```

## Requirements

- Node.js 18.0.0 or higher
- npm or yarn

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── health/route.ts     # Health check
│   │   └── upload/route.ts     # Document processing
│   ├── components/
│   │   └── FileUpload.tsx      # File upload component
│   ├── globals.css             # Tailwind CSS
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── lib/
│   └── processor.ts            # Core processing logic
├── start.sh                    # Development start script
├── start-prod.sh               # Production start script
└── README.md
```

## Medical Content Support

This service is optimized for medical documents and preserves:
- Greek letters (β-cells, α-subunits)
- Diagnostic criteria (A1C ≥6.5%)
- Complex abbreviations (HLA-DR/DQ, GAD65)
- Medical terminology (polyuria, polydipsia)
- Percentage ranges (∼90–95%)

## Configuration

Chunking can be configured via API parameters:
- `chunkSize`: Size of each chunk (default: 1000 characters)
- `overlap`: Overlap between chunks (default: 200 characters)

## License

Private - For internal use only