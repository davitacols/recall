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
      <div style={{ maxWidth: '90rem', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.02em' }}>Backlog</h1>
          <p style={{ fontSize: '16px', color: '#9ca3af', fontWeight: 300 }}>Plan and prioritize your work</p>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
          {/* Left: Backlog Issues */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issues ({backlog?.issue_count || 0})</h2>
                {selectedIssues.size > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', backgroundColor: '#292415', padding: '4px 12px', border: '1px solid #b45309' }}>
                    {selectedIssues.size} selected
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCreateIssue(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', backgroundColor: '#d97706', color: '#ffffff', border: 'none', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fbbf24'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
              >
                <PlusIcon style={{ width: '16px', height: '16px' }} />
                New Issue
              </button>
            </div>

            {!backlog?.issues || backlog.issues.length === 0 ? (
              <div style={{ padding: '64px 32px', textAlign: 'center', backgroundColor: '#1c1917', border: '1px solid #374151' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>No issues in backlog</p>
                <button
                  onClick={() => setShowCreateIssue(true)}
                  style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Create First Issue
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {backlog.issues.map(issue => {
                  const isChild = issue.parent_issue_id != null;
                  return (
                    <div
                      key={issue.id}
                      style={{
                        padding: '12px 16px',
                        paddingLeft: isChild ? '56px' : '16px',
                        backgroundColor: selectedIssues.has(issue.id) ? '#1e293b' : '#1c1917',
                        borderLeft: selectedIssues.has(issue.id) ? '3px solid #d97706' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIssues.has(issue.id)) {
                          e.currentTarget.style.backgroundColor = '#1e293b';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIssues.has(issue.id)) {
                          e.currentTarget.style.backgroundColor = '#1c1917';
                        }
                      }}
                      onClick={() => toggleIssueSelection(issue.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIssues.has(issue.id)}
                        onChange={() => toggleIssueSelection(issue.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {isChild && <span style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1 }}>↳</span>}
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{issue.key}</span>
                          <span style={{ padding: '2px 8px', fontSize: '10px', fontWeight: 700, backgroundColor: '#374151', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {issue.issue_type}
                          </span>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getPriorityColor(issue.priority) }}></span>
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</h3>
                      </div>

                      {(issue.issue_type === 'epic' || issue.issue_type === 'story') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreateIssue(issue.id);
                          }}
                          style={{ padding: '6px 12px', backgroundColor: '#374151', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.05em', flexShrink: 0 }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                        >
                          + Child
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Sprints Sidebar */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Sprints</h3>
            
            {sprints.length === 0 ? (
              <div style={{ padding: '24px', backgroundColor: '#1c1917', border: '1px solid #374151', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>No active sprints</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sprints.map(sprint => (
                  <button
                    key={sprint.id}
                    onClick={() => handleMoveToSprint(sprint.id)}
                    disabled={selectedIssues.size === 0}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#1c1917',
                      border: '1px solid #374151',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      cursor: selectedIssues.size === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedIssues.size === 0 ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (selectedIssues.size > 0) {
                        e.currentTarget.style.backgroundColor = '#292524';
                        e.currentTarget.style.borderColor = '#d97706';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedIssues.size > 0) {
                        e.currentTarget.style.backgroundColor = '#1c1917';
                        e.currentTarget.style.borderColor = '#374151';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{sprint.name}</span>
                      <ArrowRightIcon style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{sprint.start_date}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedIssues.size > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1e3a8a', border: '1px solid #3b82f6' }}>
                <p style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 500 }}>
                  Click sprint to move {selectedIssues.size} issue{selectedIssues.size !== 1 ? 's' : ''}
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
  const [issueType, setIssueType] = useState(parentIssueId ? 'task' : 'task');
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: '#1c1917', border: '1px solid #b45309', padding: '24px', width: '100%', maxWidth: '28rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {parentIssueId ? 'Create Child Issue' : 'Create Issue'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #b45309', backgroundColor: '#292415', color: '#ffffff', outline: 'none', transition: 'all 0.2s', fontSize: '14px' }}
              onFocus={(e) => e.target.style.borderColor = '#ffffff'}
              onBlur={(e) => e.target.style.borderColor = '#b45309'}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #b45309', backgroundColor: '#292415', color: '#ffffff', outline: 'none', transition: 'all 0.2s', cursor: 'pointer', fontSize: '14px' }}
                onFocus={(e) => e.target.style.borderColor = '#ffffff'}
                onBlur={(e) => e.target.style.borderColor = '#b45309'}
              >
                <option value="epic">Epic</option>
                <option value="story">Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #b45309', backgroundColor: '#292415', color: '#ffffff', outline: 'none', transition: 'all 0.2s', cursor: 'pointer', fontSize: '14px' }}
                onFocus={(e) => e.target.style.borderColor = '#ffffff'}
                onBlur={(e) => e.target.style.borderColor = '#b45309'}
              >
                <option value="lowest">Lowest</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="highest">Highest</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#d1d5db', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Issue description"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #b45309', backgroundColor: '#292415', color: '#ffffff', outline: 'none', transition: 'all 0.2s', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px' }}
              onFocus={(e) => e.target.style.borderColor = '#ffffff'}
              onBlur={(e) => e.target.style.borderColor = '#b45309'}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '10px 20px', border: '1px solid #b45309', backgroundColor: 'transparent', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', transition: 'all 0.2s', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, letterSpacing: '0.05em' }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.borderColor = '#ffffff')}
              onMouseLeave={(e) => !submitting && (e.currentTarget.style.borderColor = '#b45309')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '10px 20px', border: 'none', backgroundColor: '#d97706', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', transition: 'all 0.2s', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#fbbf24')}
              onMouseLeave={(e) => !submitting && (e.currentTarget.style.backgroundColor = '#d97706')}
            >
              {submitting && (
                <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              )}
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Backlog;
