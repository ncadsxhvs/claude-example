'use client';

import { useState, useEffect } from 'react';
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

interface DocumentWithChunks extends DocumentMetadata {
  chunks: string[];
}

export default function DocumentList() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithChunks[]>([]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  const loadDocuments = () => {
    const storedDocs = localStorage.getItem('rag-documents');
    if (storedDocs) {
      const allDocs = JSON.parse(storedDocs);
      // Filter documents for current user
      const userDocs = allDocs.filter((doc: DocumentWithChunks) => doc.userId === user?.uid);
      setDocuments(userDocs);
    }
  };

  const deleteDocument = (documentId: string) => {
    const storedDocs = localStorage.getItem('rag-documents');
    if (storedDocs) {
      const allDocs = JSON.parse(storedDocs);
      const updatedDocs = allDocs.filter((doc: DocumentWithChunks) => doc.id !== documentId);
      localStorage.setItem('rag-documents', JSON.stringify(updatedDocs));
      loadDocuments();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        Sign in to view your documents
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">No documents uploaded</p>
        <p className="text-xs text-gray-500">Upload a PDF to get started with personalized AI chat</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Your Documents</h3>
        <span className="text-xs text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
      </div>

      {documents.map((doc) => (
        <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 text-red-500 flex-shrink-0">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                    <path d="M14 2v6h6M16 13H8m8 4H8m8 4H8"/>
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-900 truncate" title={doc.fileName}>
                  {doc.fileName}
                </h4>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  doc.status === 'processed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {doc.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 mb-3">
                <div>
                  <span className="font-medium">Size:</span> {formatFileSize(doc.fileSize)}
                </div>
                <div>
                  <span className="font-medium">Chunks:</span> {doc.chunksCount}
                </div>
                <div>
                  <span className="font-medium">Text:</span> {doc.textLength.toLocaleString()} chars
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span> {formatDate(doc.uploadedAt)}
                </div>
              </div>
            </div>

            <button
              onClick={() => deleteDocument(doc.id)}
              className="ml-4 p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete document"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}