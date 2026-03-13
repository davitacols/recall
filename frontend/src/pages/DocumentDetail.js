import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { useToast } from '../components/Toast';
import { MentionInput } from '../components/MentionInput';
import { AIEnhancementButton, AIResultsPanel } from '../components/AIEnhancements';
import RichTextEditor from '../components/RichTextEditor';
import RichTextRenderer from '../components/RichTextRenderer';
import { ArrowLeftIcon, TrashIcon, PencilIcon, ChatBubbleLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';


export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { success, error } = useToast();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileUrl, setFileUrl] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [aiResults, setAiResults] = useState(null);

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
    fetchComments();
  }, [id]);

  useEffect(() => () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
  }, [fileUrl]);

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load document');
      }
      const data = await res.json();
      setDocument(data);
      setFormData(data);
      setFileUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
      
      if (data.has_file) {
        const fileRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/file/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!fileRes.ok) {
          throw new Error('Failed to load attached file');
        }
        const blob = await fileRes.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      }
    } catch (err) {
      console.error('Error:', err);
      setDocument(null);
      error('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/comments/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to load comments');
      }
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error('Error:', err);
      error('Failed to load comments');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/comments/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });
      if (!res.ok) {
        throw new Error('Failed to add comment');
      }
      const data = await res.json();
      setComments([...comments, data]);
      setNewComment('');
      success('Comment added');
    } catch (err) {
      error('Failed to add comment');
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/organizations/pdf/document/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to export PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.title}.pdf`;
      a.click();
      success('PDF downloaded');
    } catch (err) {
      error('Failed to export PDF');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        throw new Error('Failed to update document');
      }
      setEditing(false);
      fetchDocument();
      success('Document updated successfully');
    } catch (err) {
      error('Failed to update document');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/documents/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to delete document');
      }
      success('Document deleted');
      navigate('/business/documents');
    } catch (err) {
      error('Failed to delete document');
    }
  };

  if (loading) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Loading...</div></div>;
  if (!document) return <div className={`min-h-screen ${bgPrimary} p-8`}><div className={textPrimary}>Document not found</div></div>;

  const updatedAt = document.updated_at ? new Date(document.updated_at).toLocaleDateString() : "N/A";
  const createdAt = document.created_at ? new Date(document.created_at).toLocaleDateString() : "N/A";
  const typeLabel = document.document_type || "general";
  const versionLabel = document.version || "-";

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5 md:p-6 mb-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => navigate('/business/documents')}
              className={`inline-flex items-center gap-2 px-3 py-2 bg-transparent border ${borderColor} ${textPrimary} rounded-md ${hoverBg} text-sm transition-all`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              All Documents
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPDF}
                className={`inline-flex items-center gap-2 px-3 py-2 bg-transparent border ${borderColor} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} text-sm transition-all`}
                title="Export to PDF"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export PDF
              </button>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className={`inline-flex items-center gap-2 px-3 py-2 bg-transparent border ${borderColor} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} text-sm transition-all`}
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
          <p className={`mt-4 text-xs font-semibold tracking-[0.14em] ${textTertiary}`}>DOCUMENT WORKSPACE</p>
          <h1 className={`mt-2 text-2xl md:text-3xl font-bold ${textPrimary}`}>{document.title}</h1>
          <p className={`mt-2 text-sm ${textSecondary}`}>
            Keep file context, document content, and team comments in one structured page.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8 space-y-6">
            <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5 md:p-6`}>
              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded-md focus:outline-none focus:border-stone-600`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Content</label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Write document content..."
                      darkMode={darkMode}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className={`px-4 py-2 bg-transparent ${textTertiary} border ${borderColor} rounded-md ${hoverBg} font-medium text-sm`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-transparent border ${inputBorder} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} font-medium text-sm`}
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className={`prose prose-stone ${darkMode ? 'prose-invert' : ''} max-w-none`}>
                  {document.description && <p className={`${textTertiary} mb-6`}>{document.description}</p>}

                  {document.has_file && fileUrl && (
                    <div className={`mb-6 p-5 ${inputBg} border ${borderColor} rounded-xl`}>
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-4 not-prose`}>Attached File</h3>
                      {document.file_type?.includes('pdf') ? (
                        <iframe
                          src={fileUrl}
                          className={`w-full h-[560px] border ${borderColor} rounded-lg`}
                          title="Document Preview"
                        />
                      ) : (
                        <div className="not-prose">
                          <p className={`${textSecondary} mb-3 text-sm`}>File: {document.file_name}</p>
                          <a
                            href={fileUrl}
                            download={document.file_name}
                            className={`inline-block px-4 py-2 bg-transparent border ${borderColor} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
                          >
                            Download File
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {!document.has_file && document.file_url && (
                    <div className={`mb-6 p-4 ${inputBg} border border-yellow-600 rounded-lg`}>
                      <p className="text-yellow-500 text-sm">Warning: this document uses old file storage. Please re-upload the file.</p>
                    </div>
                  )}

                  {document.content && (
                    <div>
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Content</h3>
                      <RichTextRenderer content={document.content} darkMode={darkMode} />
                    </div>
                  )}
                </div>
              )}
            </section>

            {!editing && (
              <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5 md:p-6`}>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center gap-2`}>
                  <ChatBubbleLeftIcon className="w-5 h-5" />
                  Comments ({comments.length})
                </h3>

                <form onSubmit={handleAddComment} className="mb-6">
                  <MentionInput
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Add a comment... (Type @ to mention someone)"
                    rows={3}
                    darkMode={darkMode}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className={`mt-2 px-4 py-2 bg-transparent border ${inputBorder} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Post Comment
                  </button>
                </form>

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className={`p-4 ${inputBg} border ${borderColor} rounded-lg`}>
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <span className={`font-medium ${textPrimary}`}>{comment.user.full_name}</span>
                        <span className={`text-xs ${textTertiary}`}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={`${textSecondary} whitespace-pre-wrap`}>{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className={`text-center ${textTertiary} py-8`}>No comments yet. Be the first to comment.</p>
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 self-start">
            <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5`}>
              <h3 className={`text-sm font-semibold tracking-[0.11em] ${textTertiary} uppercase mb-4`}>Document Snapshot</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`${inputBg} border ${borderColor} rounded-lg p-3`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${textTertiary}`}>Type</p>
                  <p className={`mt-1 text-sm font-semibold ${textPrimary} capitalize`}>{typeLabel}</p>
                </div>
                <div className={`${inputBg} border ${borderColor} rounded-lg p-3`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${textTertiary}`}>Version</p>
                  <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{versionLabel}</p>
                </div>
                <div className={`${inputBg} border ${borderColor} rounded-lg p-3`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${textTertiary}`}>Created</p>
                  <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{createdAt}</p>
                </div>
                <div className={`${inputBg} border ${borderColor} rounded-lg p-3`}>
                  <p className={`text-[11px] uppercase tracking-[0.08em] ${textTertiary}`}>Updated</p>
                  <p className={`mt-1 text-sm font-semibold ${textPrimary}`}>{updatedAt}</p>
                </div>
              </div>
            </section>

            <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5`}>
              <h3 className={`text-sm font-semibold tracking-[0.11em] ${textTertiary} uppercase mb-3`}>Ownership</h3>
              <p className={`text-sm ${textSecondary}`}>
                Created by <span className={textPrimary}>{document.created_by?.full_name || "Unknown"}</span>
              </p>
              <p className={`text-sm ${textSecondary} mt-2`}>
                Last updated by <span className={textPrimary}>{document.updated_by?.full_name || "Unknown"}</span>
              </p>
            </section>

            <section className={`${bgSecondary} border ${borderColor} rounded-2xl p-5`}>
              <h3 className={`text-sm font-semibold tracking-[0.11em] ${textTertiary} uppercase mb-3`}>Actions</h3>
              <div className="flex flex-wrap gap-2">
                <AIEnhancementButton
                  content={document.content || document.description || ''}
                  title={document.title}
                  type="document"
                  documentId={document.id}
                  onResult={(feature, data) => setAiResults(data)}
                />
                <button
                  onClick={() => setEditing(true)}
                  className={`inline-flex items-center gap-2 px-3 py-2 bg-transparent border ${borderColor} ${textPrimary} rounded-md ${hoverBg} ${hoverBorder} text-sm transition-all`}
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-transparent border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white text-sm transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
      
      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}


