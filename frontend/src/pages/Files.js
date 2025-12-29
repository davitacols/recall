import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';

function Files() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/api/conversations/documents/all/');
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Files</h1>
        <p className="text-base text-gray-600">{documents.length} uploaded files</p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No files yet</h3>
          <p className="text-base text-gray-600">
            Files attached to conversations will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 p-6 hover:border-gray-900 transition-colors"
            >
              <div className="flex items-start gap-4">
                <DocumentIcon className="w-5 h-5 text-gray-900 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-gray-900 hover:underline mb-2 block"
                  >
                    {doc.filename}
                  </a>
                  {doc.comment && (
                    <p className="text-sm text-gray-600 mb-2">{doc.comment}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>Uploaded by {doc.uploaded_by}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <a
                  href={doc.file_url}
                  download
                  className="px-4 py-2 border border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-100"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Files;
