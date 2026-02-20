import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileUrl, setFileUrl] = useState('');

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-stone-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-stone-700' : 'hover:bg-gray-100';
  const hoverBorder = darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-white';
  const inputBorder = darkMode ? 'border-stone-700' : 'border-gray-300';
  const inputText = darkMode ? 'text-stone-200' : 'text-gray-900';

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/business/documents/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDocument(data);
      setFormData(data);
      
      if (data.has_file) {
        const fileRes = await fetch(`http://localhost:8000/api/business/documents/${id}/file/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await fileRes.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/business/documents/${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setEditing(false);
      fetchDocument();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/business/documents/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/business/documents');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Loading...</div></div>;
  if (!document) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Document not found</div></div>;

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/business/documents')}
          className={`flex items-center gap-2 px-3 py-2 mb-6 bg-transparent border ${borderColor} ${textPrimary} rounded ${hoverBg} text-sm transition-all`}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-8`}>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={15}
                  className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={`px-4 py-2 bg-transparent ${textTertiary} border-2 ${borderColor} rounded ${hoverBg} font-medium text-sm`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-transparent border-2 ${inputBorder} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm`}
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>{document.title}</h1>
                  <div className={`flex gap-4 text-sm ${textSecondary}`}>
                    <span>Type: {document.document_type}</span>
                    <span>Version: {document.version}</span>
                    <span>Updated: {new Date(document.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className={`p-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} transition-all`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`p-2 bg-transparent border-2 border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className={`prose prose-stone ${darkMode ? 'prose-invert' : ''} max-w-none`}>
                <p className={`${textTertiary} mb-6`}>{document.description}</p>
                {document.has_file && fileUrl && (
                  <div className={`mb-6 p-6 ${inputBg} border ${borderColor} rounded`}>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Attached File</h3>
                    {document.file_type?.includes('pdf') ? (
                      <iframe
                        src={fileUrl}
                        className={`w-full h-[600px] border ${borderColor} rounded`}
                        title="Document Preview"
                      />
                    ) : (
                      <div>
                        <p className={`${textSecondary} mb-3`}>File: {document.file_name}</p>
                        <a 
                          href={fileUrl}
                          download={document.file_name}
                          className={`inline-block px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
                        >
                          Download File
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {!document.has_file && document.file_url && (
                  <div className={`mb-6 p-4 ${inputBg} border border-yellow-600 rounded`}>
                    <p className={`text-yellow-500 text-sm`}>⚠️ This document uses old file storage. Please re-upload the file.</p>
                  </div>
                )}
                {document.content && (
                  <div>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Content</h3>
                    <div className={`${textPrimary} whitespace-pre-wrap`}>{document.content}</div>
                  </div>
                )}
              </div>
              {document.created_by && (
                <div className={`mt-8 pt-6 border-t ${borderColor} text-sm ${textSecondary}`}>
                  Created by {document.created_by.full_name} • Last updated by {document.updated_by?.full_name || 'Unknown'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
