import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import BulkEditBar from '../components/BulkEditBar';

function Backlog() {
  const { projectId } = useParams();
  const [backlog, setBacklog] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [backlogRes, sprintsRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/backlog/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`)
      ]);
      setBacklog(backlogRes.data);
      setSprints(sprintsRes.data);
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToSprint = async (sprintId) => {
    if (selectedIssues.size === 0) return;

    try {
      for (const issueId of selectedIssues) {
        await api.put(`/api/agile/issues/${issueId}/`, { sprint_id: sprintId });
      }
      setSelectedIssues(new Set());
      fetchData();
    } catch (error) {
      console.error('Failed to move issues:', error);
    }
  };

  const toggleIssueSelection = (issueId) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111827' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #374151', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '64px' }}>
          <div>
            <h1 style={{ fontSize: '56px', fontWeight: 900, color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.02em' }}>Product Backlog</h1>
            <p style={{ fontSize: '20px', color: '#d1d5db', fontWeight: 300 }}>Plan and prioritize your work</p>
          </div>
          <button
            onClick={() => setShowCreateIssue(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', backgroundColor: '#d97706', color: '#ffffff', border: 'none', fontWeight: 700, textTransform: 'uppercase', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
          >
            <PlusIcon style={{ width: '20px', height: '20px' }} />
            New Issue
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Backlog Column */}
          <div>
            <div style={{ backgroundColor: '#1c1917', border: '1px solid #b45309', padding: '32px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#b45309'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Backlog ({backlog?.issue_count || 0})</h2>
                {selectedIssues.size > 0 && (
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#d1d5db' }}>{selectedIssues.size} selected</span>
                )}
              </div>

              {!backlog?.issues || backlog.issues.length === 0 ? (
                <p style={{ color: '#9ca3af', fontWeight: 500, padding: '32px 0', textAlign: 'center' }}>No issues in backlog</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {backlog.issues.map(issue => (
                    <div
                      key={issue.id}
                      style={{
                        padding: '16px',
                        borderLeft: '4px solid',
                        borderLeftColor: selectedIssues.has(issue.id) ? '#d97706' : '#374151',
                        backgroundColor: selectedIssues.has(issue.id) ? '#292415' : '#1c1917',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIssues.has(issue.id)) {
                          e.currentTarget.style.borderLeftColor = '#d97706';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIssues.has(issue.id)) {
                          e.currentTarget.style.borderLeftColor = '#374151';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }} onClick={() => toggleIssueSelection(issue.id)}>
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue.id)}
                          onChange={() => toggleIssueSelection(issue.id)}
                          style={{ marginTop: '4px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{issue.key}</span>
                            <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, border: '1px solid #b45309', backgroundColor: '#292415', color: '#ffffff' }}>
                              {issue.issue_type}
                            </span>
                          </div>
                          <h3 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '8px', fontSize: '16px' }}>{issue.title}</h3>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                            {issue.assignee_name && <div>Assigned: {issue.assignee_name}</div>}
                            {issue.story_points && <div>{issue.story_points} pts</div>}
                            <div style={{ fontWeight: 600, color: getPriorityColor(issue.priority) }}>
                              {issue.priority}
                            </div>
                          </div>
                        </div>
                        {issue.issue_type === 'epic' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCreateIssue(issue.id);
                            }}
                            style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                          >
                            + Add Child
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sprints Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ backgroundColor: '#1c1917', border: '1px solid #b45309', padding: '32px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ffffff'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#b45309'}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Sprints</h3>
              {sprints.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>No sprints</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sprints.map(sprint => (
                    <button
                      key={sprint.id}
                      onClick={() => handleMoveToSprint(sprint.id)}
                      disabled={selectedIssues.size === 0}
                      style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: '#292415',
                        border: '1px solid #b45309',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        cursor: selectedIssues.size === 0 ? 'not-allowed' : 'pointer',
                        opacity: selectedIssues.size === 0 ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (selectedIssues.size > 0) {
                          e.currentTarget.style.backgroundColor = '#1c1917';
                          e.currentTarget.style.borderColor = '#ffffff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedIssues.size > 0) {
                          e.currentTarget.style.backgroundColor = '#292415';
                          e.currentTarget.style.borderColor = '#b45309';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', marginBottom: '4px' }}>{sprint.name}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{sprint.start_date}</div>
                        </div>
                        <ArrowRightIcon style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedIssues.size > 0 && (
              <div style={{ padding: '16px', backgroundColor: '#1e3a8a', border: '1px solid #3b82f6' }}>
                <p style={{ fontSize: '14px', color: '#93c5fd', fontWeight: 500 }}>
                  Select a sprint above to move {selectedIssues.size} issue{selectedIssues.size !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateIssue && (
        <CreateIssueModal
          projectId={projectId}
          parentIssueId={typeof showCreateIssue === 'number' ? showCreateIssue : null}
          onClose={() => setShowCreateIssue(false)}
          onSuccess={() => {
            setShowCreateIssue(false);
            fetchData();
          }}
        />
      )}
      
      <BulkEditBar 
        selectedIssues={Array.from(selectedIssues)}
        onUpdate={fetchData}
        onClear={() => setSelectedIssues(new Set())}
      />
    </div>
  );
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'highest':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

function CreateIssueModal({ projectId, parentIssueId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState(parentIssueId ? 'story' : 'task');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/issues/`, {
        title,
        description,
        issue_type: issueType,
        priority,
        parent_issue_id: parentIssueId
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to create issue: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{parentIssueId ? 'Create Child Issue' : 'Create Issue'}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="lowest">Lowest</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Issue description"
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-24"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Backlog;
