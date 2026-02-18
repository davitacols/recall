import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../utils/ThemeAndAccessibility';

function KanbanBoard() {
  const { projectId } = useParams();
  const { darkMode } = useTheme();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [groupBy, setGroupBy] = useState('assignee');

  const statuses = ['todo', 'in_progress', 'in_review', 'testing', 'done'];
  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    testing: 'Testing',
    done: 'Done'
  };

  useEffect(() => {
    fetchIssues();
  }, [projectId]);

  const fetchIssues = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/backlog/`);
      // Only show issues IN SPRINTS (not backlog items)
      const sprintIssues = (response.data.issues || []).filter(i => i.sprint_id != null);
      setIssues(sprintIssues);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (status) => {
    if (!draggedIssue) return;
    
    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, { status });
      setDraggedIssue(null);
      fetchIssues();
    } catch (error) {
      console.error('Failed to move issue:', error);
    }
  };

  const getSwimLanes = () => {
    if (groupBy === 'assignee') {
      const assignees = [...new Set(issues.map(i => i.assignee_name || 'Unassigned'))];
      return assignees.map(assignee => ({
        id: assignee,
        name: assignee,
        issues: issues.filter(i => (i.assignee_name || 'Unassigned') === assignee)
      }));
    }
    return [{ id: 'all', name: 'All Issues', issues }];
  };

  const bgColor = darkMode ? '#0c0a09' : '#ffffff';
  const cardBg = darkMode ? '#1c1917' : '#ffffff';
  const borderColor = darkMode ? '#374151' : '#e5e7eb';
  const textColor = darkMode ? '#ffffff' : '#111827';
  const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
  const hoverBg = darkMode ? '#1e293b' : '#f3f4f6';
  const hoverBorder = darkMode ? '#b45309' : '#9ca3af';
  const spinnerBorder = darkMode ? '#d97706' : '#6b7280';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: `2px solid ${spinnerBorder}`, borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const swimLanes = getSwimLanes();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgColor }}>
      <div style={{ maxWidth: '100%', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 900, color: textColor, marginBottom: '4px', letterSpacing: '-0.02em' }}>Kanban Board</h1>
            <p style={{ fontSize: '14px', color: textSecondary }}>Active sprint work • {issues.length} issues</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: textSecondary, fontWeight: 600, textTransform: 'uppercase' }}>Group by:</span>
            <button
              onClick={() => setGroupBy('assignee')}
              style={{
                padding: '8px 16px',
                backgroundColor: groupBy === 'assignee' ? '#d97706' : cardBg,
                color: textColor,
                border: '1px solid ' + (groupBy === 'assignee' ? '#d97706' : borderColor),
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Assignee
            </button>
            <button
              onClick={() => setGroupBy('none')}
              style={{
                padding: '8px 16px',
                backgroundColor: groupBy === 'none' ? '#d97706' : cardBg,
                color: textColor,
                border: '1px solid ' + (groupBy === 'none' ? '#d97706' : borderColor),
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              None
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div style={{ overflowX: 'auto' }}>
          {/* Column Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(5, 280px)', gap: '12px', marginBottom: '12px', minWidth: 'fit-content' }}>
            <div style={{ padding: '12px', backgroundColor: cardBg, border: `1px solid ${borderColor}` }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Swimlane</span>
            </div>
            {statuses.map(status => (
              <div key={status} style={{ padding: '12px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: textColor, textTransform: 'uppercase' }}>{statusLabels[status]}</span>
                <div style={{ fontSize: '10px', color: textSecondary, marginTop: '4px' }}>
                  {issues.filter(i => i.status === status).length}
                </div>
              </div>
            ))}
          </div>

          {/* Swim Lanes */}
          {swimLanes.map(lane => (
            <div key={lane.id} style={{ display: 'grid', gridTemplateColumns: '200px repeat(5, 280px)', gap: '12px', marginBottom: '12px', minWidth: 'fit-content' }}>
              {/* Lane Header */}
              <div style={{ padding: '12px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#ffffff', flexShrink: 0 }}>
                  {lane.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lane.name}</div>
                  <div style={{ fontSize: '11px', color: textSecondary }}>{lane.issues.length} issues</div>
                </div>
              </div>

              {/* Status Columns */}
              {statuses.map(status => {
                const columnIssues = lane.issues.filter(i => i.status === status);
                return (
                  <div
                    key={status}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status)}
                    style={{
                      padding: '8px',
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      minHeight: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {columnIssues.map(issue => {
                      const isDragging = draggedIssue?.id === issue.id;
                      return (
                        <div
                          key={issue.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, issue)}
                          onDragEnd={() => setDraggedIssue(null)}
                          onClick={() => window.location.href = `/issues/${issue.id}`}
                          style={{
                            padding: '10px',
                            backgroundColor: darkMode ? '#111827' : '#f9fafb',
                            border: `1px solid ${borderColor}`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            opacity: isDragging ? 0.5 : 1,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isDragging) {
                              e.currentTarget.style.backgroundColor = hoverBg;
                              e.currentTarget.style.borderColor = hoverBorder;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDragging) {
                              e.currentTarget.style.backgroundColor = darkMode ? '#111827' : '#f9fafb';
                              e.currentTarget.style.borderColor = borderColor;
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>{issue.key}</span>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getPriorityColor(issue.priority) }}></span>
                          </div>
                          <h3 style={{ fontSize: '13px', fontWeight: 600, color: textColor, lineHeight: '1.4', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{issue.title}</h3>
                          {issue.story_points && (
                            <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, backgroundColor: darkMode ? '#374151' : '#e5e7eb', padding: '2px 6px', display: 'inline-block' }}>
                              {issue.story_points} pts
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
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

export default KanbanBoard;
