'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface DocumentMetadata {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  textLength: number;
  chunksCount: number;
  status: string;
}

interface DocumentUploadProps {
  onDocumentUploaded?: (document: DocumentMetadata) => void;
}

export default function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) {
      setError('Please sign in to upload documents');
      return;
    }

    const supportedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!supportedTypes.includes(file.type)) {
      setError('Only PDF, TXT, and MD files are supported in Phase 1');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Phase 2: Document is now stored in PostgreSQL with embeddings
      console.log('Document uploaded successfully:', {
        id: data.document.id,
        fileName: data.document.fileName,
        chunksCount: data.document.chunksCount,
        tokensUsed: data.embeddings?.tokensUsed,
        estimatedCost: data.embeddings?.estimatedCost
      });

      // Notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded(data.document);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please sign in to upload documents
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="space-y-2">
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-600">Processing document...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Drop your files here or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PDF, TXT, MD files up to 10MB (Phase 1)
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}