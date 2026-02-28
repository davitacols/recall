import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';

function IssueAttachments({ issueId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttachments();
  }, [issueId]);

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.message ||
    fallback;

  const fetchAttachments = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/attachments/list/`);
      setAttachments(response.data || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load attachments'));
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/api/agile/issues/${issueId}/attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchAttachments();
      event.target.value = '';
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to upload file'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      await api.delete(`/api/agile/attachments/${attachmentId}/`);
      await fetchAttachments();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete attachment'));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Attachments ({attachments.length})</h3>
        <label className="px-4 py-2 bg-gray-900 text-white text-sm font-bold cursor-pointer hover:bg-black">
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 hover:border-gray-900">
            <div className="flex items-center gap-3">
              <PaperClipIcon className="w-5 h-5 text-gray-600" />
              <div>
                <a href={attachment.file} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:underline">
                  {attachment.filename}
                </a>
                <p className="text-xs text-gray-600">
                  {formatFileSize(attachment.file_size)} | {attachment.uploaded_by_name || 'Unknown'} | {new Date(attachment.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button onClick={() => handleDelete(attachment.id)} className="p-2 text-red-600 hover:bg-red-50">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}

        {attachments.length === 0 && (
          <p className="text-center text-gray-600 py-8">No attachments yet</p>
        )}
      </div>
    </div>
  );
}

export default IssueAttachments;
