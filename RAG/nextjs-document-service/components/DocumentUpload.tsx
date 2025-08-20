'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Document {
  id: string;
  filename: string;
  file_size: number;
  chunks_count: number;
  status: string;
  uploaded_at: string;
}

interface Chunk {
  id: string;
  chunk_index: number;
  text: string;
  word_count: number;
}

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadChunks = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/chunks`);
      const data = await response.json();
      if (data.success) {
        setChunks(data.chunks);
        setSelectedDocumentId(documentId);
      }
    } catch (error) {
      console.error('Failed to load chunks:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', 'demo-user');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        // Simulate progress for demo
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setIsUploading(false);
              loadDocuments(); // Refresh document list
              return 100;
            }
            return prev + 10;
          });
        }, 200);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf,.json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            
            {!isUploading ? (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600 mb-4">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Supports: .txt, .md, .markdown, .pdf, .json files (max 25MB)
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  📕 PDF files include medical table extraction<br/>
                  📊 JSON files include table extraction
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-600 mb-4">Processing document...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500">{uploadProgress}% complete</p>
              </div>
            )}
          </div>

          {/* Documents List */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Uploaded Documents</h4>
            {documents.length === 0 ? (
              <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocumentId === doc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => loadChunks(doc.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(doc.file_size)} • {doc.chunks_count} chunks
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          doc.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chunks Display */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Chunks</h3>
          
          {selectedDocumentId ? (
            chunks.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Chunk {chunk.chunk_index + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {chunk.word_count} words
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {chunk.text.length > 200 
                        ? chunk.text.substring(0, 200) + '...'
                        : chunk.text
                      }
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-gray-500">Loading chunks...</p>
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-500">Select a document to view its chunks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}