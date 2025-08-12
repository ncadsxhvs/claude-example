'use client';

import { useState, useEffect } from 'react';
import SimpleChart from './SimpleChart';

interface VectorStats {
  systemStats: {
    total_documents: number;
    total_chunks: number;
    avg_words_per_chunk: number;
    avg_chars_per_chunk: number;
    total_file_size: number;
    total_text_length: number;
  };
  typeDistribution: Array<{
    file_type: string;
    count: number;
    total_size: number;
  }>;
  embeddingInfo: {
    dimensions: number;
    chunks_with_embeddings: number;
  };
  uploadActivity: Array<{
    upload_date: string;
    documents_count: number;
    chunks_count: number;
  }>;
  chunkSizeDistribution: Array<{
    size_category: string;
    count: number;
    avg_words: number;
  }>;
  timestamp: string;
}

export default function VectorDashboard() {
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vector-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch vector stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Vector Database Analytics</h2>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 h-20 rounded"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-40 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">Vector Database Analytics</h2>
        <div className="text-red-600">Error: {error}</div>
        <button 
          onClick={fetchStats}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Vector Database Analytics</h2>
        <button 
          onClick={fetchStats}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(stats.systemStats.total_documents || 0)}
          </div>
          <div className="text-sm text-gray-600">Documents Processed</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(stats.systemStats.total_chunks || 0)}
          </div>
          <div className="text-sm text-gray-600">Text Chunks</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {stats.embeddingInfo.dimensions}D
          </div>
          <div className="text-sm text-gray-600">Embedding Dimensions</div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* File Type Distribution Chart */}
        <SimpleChart
          title="File Type Distribution"
          type="pie"
          data={stats.typeDistribution.map((type, index) => ({
            label: type.file_type.split('/')[1] || type.file_type,
            value: type.count,
            color: [
              '#3B82F6', // blue
              '#10B981', // green
              '#8B5CF6', // purple
              '#F59E0B', // amber
              '#EF4444', // red
            ][index % 5]
          }))}
        />

        {/* Chunk Size Distribution Chart */}
        <SimpleChart
          title="Chunk Size Distribution"
          type="bar"
          data={stats.chunkSizeDistribution.map((chunk, index) => ({
            label: chunk.size_category.split(' ')[0], // Get just "Small", "Medium", etc.
            value: chunk.count,
            color: [
              '#10B981', // green for small
              '#3B82F6', // blue for medium
              '#8B5CF6', // purple for large
              '#F59E0B', // amber for very large
            ][index % 4]
          }))}
        />
      </div>

      {/* Embedding Vector Visualization */}
      {stats.embeddingInfo.chunks_with_embeddings > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <h3 className="font-medium mb-3">Embedding Vector Space</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {stats.embeddingInfo.dimensions}
              </div>
              <div className="text-xs text-gray-600">Vector Dimensions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {formatNumber(stats.embeddingInfo.chunks_with_embeddings)}
              </div>
              <div className="text-xs text-gray-600">Embedded Chunks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {formatNumber(stats.embeddingInfo.dimensions * stats.embeddingInfo.chunks_with_embeddings)}
              </div>
              <div className="text-xs text-gray-600">Total Vector Values</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-amber-600">
                OpenAI
              </div>
              <div className="text-xs text-gray-600">text-embedding-3-small</div>
            </div>
          </div>
          
          {/* Visual representation of embedding space */}
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">Vector Space Density</div>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 20 }, (_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: `hsl(${(i * 18) % 360}, 70%, ${60 + (i % 3) * 10}%)`,
                    opacity: stats.embeddingInfo.chunks_with_embeddings > i * 10 ? 1 : 0.2
                  }}
                />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              High-dimensional semantic similarity space
            </div>
          </div>
        </div>
      )}

      {/* Storage Info */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Storage</div>
            <div className="text-gray-600">
              {formatBytes(stats.systemStats.total_file_size || 0)}
            </div>
          </div>
          <div>
            <div className="font-medium">Text Length</div>
            <div className="text-gray-600">
              {formatNumber(stats.systemStats.total_text_length || 0)} chars
            </div>
          </div>
          <div>
            <div className="font-medium">Avg Chunk Size</div>
            <div className="text-gray-600">
              {Math.round(stats.systemStats.avg_words_per_chunk || 0)} words
            </div>
          </div>
          <div>
            <div className="font-medium">Embeddings</div>
            <div className="text-gray-600">
              {formatNumber(stats.embeddingInfo.chunks_with_embeddings || 0)} vectors
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}