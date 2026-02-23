import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Documents() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerType, setViewerType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', document_type: 'other', content: '', tags: [] });
  const [uploadFile, setUploadFile] = useState(null);

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
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      fetchDocuments();
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/search/?q=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOpenDocument = async (doc) => {
    if (doc.has_file) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/${doc.id}/file/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        
        if (doc.file_type?.includes('pdf')) {
          setViewerUrl(url);
          setViewerType('pdf');
          setShowViewer(true);
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.file_name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    } else {
      navigate(`/business/documents/${doc.id}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('document_type', formData.document_type);
      formDataToSend.append('content', formData.content);
      if (uploadFile) {
        formDataToSend.append('file', uploadFile);
      }
      
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });
      setShowModal(false);
      setFormData({ title: '', description: '', document_type: 'other', content: '', tags: [] });
      setUploadFile(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const typeColors = {
    policy: darkMode ? 'text-blue-400 bg-blue-400/20' : 'text-blue-600 bg-blue-600/20',
    procedure: darkMode ? 'text-green-400 bg-green-400/20' : 'text-green-600 bg-green-600/20',
    guide: darkMode ? 'text-purple-400 bg-purple-400/20' : 'text-purple-600 bg-purple-600/20',
    report: darkMode ? 'text-yellow-400 bg-yellow-400/20' : 'text-yellow-600 bg-yellow-600/20',
    other: darkMode ? 'text-stone-400 bg-stone-400/20' : 'text-gray-600 bg-gray-600/20'
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-4 ${inputBg} rounded w-3/4 mb-3`}></div>
                <div className={`h-3 ${inputBg} rounded w-full mb-2`}></div>
                <div className={`h-3 ${inputBg} rounded w-2/3`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Documents</h1>
            <p className={`text-sm ${textSecondary}`}>Manage policies, procedures, and guides</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Document
          </button>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={`flex-1 px-4 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
            />
            <button
              onClick={handleSearch}
              className={`px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} transition-all`}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => handleOpenDocument(doc)}
              className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg cursor-pointer ${hoverBg} transition-all`}
            >
              <div className="flex items-start gap-3 mb-3">
                <DocumentTextIcon className={`w-5 h-5 ${textSecondary} flex-shrink-0`} />
                <div className="flex-1">
                  <h3 className={`text-base font-semibold ${textPrimary} mb-1`}>{doc.title}</h3>
                  <p className={`text-sm ${textTertiary} line-clamp-2`}>{doc.description}</p>
                  {doc.has_file && doc.file_name && (
                    <p className={`text-xs ${textSecondary} mt-2 flex items-center gap-1`}>
                      <span>📎</span>
                      <span className="truncate">{doc.file_name}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className={`flex justify-between items-center pt-3 border-t ${borderColor}`}>
                <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[doc.document_type]}`}>
                  {doc.document_type}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/business/documents/${doc.id}`); }}
                  className={`px-3 py-1 text-xs ${textPrimary} border ${borderColor} rounded hover:bg-stone-600 transition-all`}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {showViewer && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setShowViewer(false)}>
            <div className="w-full h-full p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <button onClick={() => setShowViewer(false)} className="text-white text-2xl px-4 py-2 hover:bg-white/10 rounded">&times;</button>
              </div>
              <iframe src={viewerUrl} className="w-full h-[calc(100vh-80px)] bg-white" title="Document" />
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-5`}>Create Document</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Type</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  >
                    <option value="policy">Policy</option>
                    <option value="procedure">Procedure</option>
                    <option value="guide">Guide</option>
                    <option value="report">Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Upload File (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                  <p className={`text-xs ${textTertiary} mt-1`}>Upload a file or write content below</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 bg-transparent ${textTertiary} border-2 ${borderColor} rounded ${hoverBg} font-medium text-sm`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-transparent border-2 ${inputBorder} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm`}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
