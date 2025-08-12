'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import VectorDashboard from '../components/vectors/VectorDashboard';
import ProcessingStatus from '../components/realtime/ProcessingStatus';
import { ProcessingResult, DocumentChunk } from '@/lib/processor';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', 'demo-user'); // In production, get from auth context
      formData.append('chunkSize', '1000');
      formData.append('overlap', '200');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Processing failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Real-time Processing Status */}
      <ProcessingStatus 
        userId="demo-user" 
        onProcessingComplete={(documentId) => {
          console.log(`Document ${documentId} processing completed`);
          // Optionally refresh data or show notification
        }}
      />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Document Processing Service
        </h1>
        <p className="text-gray-600">
          Upload text or markdown files for intelligent chunking and vector embeddings
        </p>
      </div>

      {/* Vector Database Analytics Dashboard */}
      <VectorDashboard />

      <FileUpload
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        isProcessing={isProcessing}
      />

      {error && (
        <div className="card mt-6 border-red-200 bg-red-50">
          <div className="text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {selectedFile && !result && (
        <div className="mt-6 text-center">
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="btn btn-primary"
          >
            {isProcessing ? 'Processing...' : 'Process Document'}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-8">
          {result.isDuplicate && (
            <div className="card mb-6 border-amber-200 bg-amber-50">
              <div className="flex items-center space-x-2 text-amber-800">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-semibold">Duplicate File Detected</div>
                  <div className="text-sm">{result.message}</div>
                  <div className="text-xs mt-1">
                    Originally uploaded: {new Date(result.document.uploadedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="stats">
            <div className="stat-card">
              <div className="stat-value">{result.document.chunksCount}</div>
              <div className="stat-label">Chunks</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{(result.document.size / 1024).toFixed(1)}KB</div>
              <div className="stat-label">File Size</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{result.document.textLength.toLocaleString()}</div>
              <div className="stat-label">Characters</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.ceil(result.document.textLength / 5)}</div>
              <div className="stat-label">Est. Words</div>
            </div>
          </div>

          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-3">Preview</h3>
            <p className="text-gray-700 leading-relaxed">{result.preview}</p>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Document Chunks</h3>
              <button
                onClick={handleReset}
                className="btn bg-gray-500 hover:bg-gray-600 text-white text-sm"
              >
                Process New File
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {result.chunks && result.chunks.length > 0 ? result.chunks.map((chunk) => (
                <div key={chunk.id} className="chunk">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Chunk {chunk.index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {chunk.wordCount} words
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {chunk.text}
                  </p>
                </div>
              )) : (
                <div className="text-gray-500 text-center py-4">
                  No chunks available to display
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}