'use client';

import { useState } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import SimpleSearch from '../components/SimpleSearch';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'search'>('upload');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Document RAG System
          </h1>
          <p className="text-gray-600">
            Upload documents and search with AI-powered vector similarity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📄 Upload Documents
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'search'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔍 Vector Search
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {activeTab === 'upload' && <DocumentUpload />}
          {activeTab === 'search' && <SimpleSearch />}
        </div>
      </div>
    </div>
  );
}