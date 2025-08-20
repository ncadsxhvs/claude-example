'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  isProcessing: boolean;
}

export default function FileUpload({ onFileSelect, selectedFile, isProcessing }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="card">
      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.json"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />
        
        {selectedFile ? (
          <div>
            <div className="text-4xl mb-4">
              {selectedFile.name.toLowerCase().endsWith('.pdf') ? '📕' : 
               selectedFile.name.toLowerCase().endsWith('.json') ? '📊' : '📄'}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{selectedFile.name}</h3>
            <p className="text-gray-600 mt-2">
              {selectedFile.size > 1024 * 1024 
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(selectedFile.size / 1024).toFixed(1)} KB`
              }
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {selectedFile.name.toLowerCase().endsWith('.pdf') 
                ? 'PDF with medical table extraction' 
                : selectedFile.name.toLowerCase().endsWith('.json')
                ? 'JSON with table extraction'
                : 'Text document'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Click to select a different file
            </p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop your file here or click to browse
            </h3>
            <p className="text-gray-600">
              Supports .txt, .md, .markdown, .pdf, .json files (max 25MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}