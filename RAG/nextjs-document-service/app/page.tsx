'use client';

import { useState } from 'react';
import SearchInterface from '../components/search/SearchInterface';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'analytics'>('search');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RAG Document System
        </h1>
        <p className="text-gray-600">
          Search, upload, and analyze your documents with hybrid AI-powered search
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'search', name: 'Search Documents', icon: '🔍', desc: 'Find content in your documents' },
              { id: 'upload', name: 'Upload Documents', icon: '📄', desc: 'Add new documents to the system' },
              { id: 'analytics', name: 'Analytics', icon: '📊', desc: 'View database statistics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.name}</div>
                  <div className="text-xs text-gray-400">{tab.desc}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'search' && (
          <SearchInterface 
            userId="demo-user"
            onResultSelect={(result) => {
              console.log('Selected result:', result);
            }}
          />
        )}

        {activeTab === 'upload' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Document Upload</h3>
            <p className="text-gray-600">
              Upload documents for processing and indexing.
            </p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">
              View statistics about your document collection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}