import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
import { PlusIcon } from '@heroicons/react/24/outline';
import IssueDetail from '../components/IssueDetail';

function KanbanBoard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueColumn, setNewIssueColumn] = useState(null);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      const response = await api.get(`/api/agile/boards/${boardId}/`);
      setBoard(response.data);
    } catch (error) {
      console.error('Failed to fetch board:', error);
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

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (!draggedIssue) return;

    try {
      await api.post(`/api/agile/issues/${draggedIssue.id}/move/`, {
        column_id: columnId
      });
      fetchBoard();
    } catch (error) {
      console.error('Failed to move issue:', error);
    } finally {
      setDraggedIssue(null);
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !board) return;
    try {
      await api.post(`/api/agile/projects/${board.project_id}/issues/`, {
        title: newIssueTitle,
        priority: 'medium'
      });
      setNewIssueTitle('');
      setShowNewIssue(false);
      setNewIssueColumn(null);
      fetchBoard();
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'highest':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#EAB308';
      case 'low':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!board) {
    return <div>Board not found</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, overflowX: 'auto', padding: spacing.xl }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.primary, marginBottom: spacing.lg }}>
          {board.name}
        </h1>

        {showNewIssue && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.lg,
              maxWidth: '400px',
              width: '90%',
              boxShadow: shadows.lg
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
                Create New Issue
              </h2>
              <input
                type="text"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="Issue title..."
                style={{
                  width: '100%',
                  padding: spacing.md,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: spacing.md
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateIssue()}
                autoFocus
              />
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowNewIssue(false);
                    setNewIssueTitle('');
                    setNewIssueColumn(null);
                  }}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.background,
                    color: colors.primary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIssue}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.primary,
                    color: colors.surface,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: spacing.lg, paddingBottom: spacing.lg }}>
          {board.columns.map((column) => (
            <div
              key={column.id}
              style={{
                flex: '0 0 350px',
                backgroundColor: colors.background,
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 200px)'
              }}
            >
              <div style={{
                padding: spacing.lg,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, marginBottom: '4px' }}>
                    {column.name}
                  </h2>
                  <span style={{ fontSize: '12px', color: colors.secondary }}>
                    {column.issues.length} issues
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewIssueColumn(column.id);
                    setShowNewIssue(true);
                  }}
                  style={{
                    padding: '4px 8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.secondary,
                    transition: motion.fast
                  }}
                  onMouseEnter={(e) => e.target.style.color = colors.primary}
                  onMouseLeave={(e) => e.target.style.color = colors.secondary}
                >
                  <PlusIcon style={{ width: '16px', height: '16px' }} />
                </button>
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                style={{
                  flex: 1,
                  padding: spacing.md,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.sm
                }}
              >
                {column.issues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    style={{
                      padding: spacing.md,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.md,
                      cursor: 'pointer',
                      transition: motion.fast,
                      boxShadow: draggedIssue?.id === issue.id ? shadows.md : shadows.sm,
                      opacity: draggedIssue?.id === issue.id ? 0.5 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: spacing.sm }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary }}>
                        {issue.key}
                      </span>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getPriorityColor(issue.priority)
                        }}
                      />
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm, lineHeight: 1.4 }}>
                      {issue.title}
                    </h3>
                    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                      {issue.labels.map((label) => (
                        <span
                          key={label}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            backgroundColor: colors.background,
                            color: colors.secondary,
                            borderRadius: '2px'
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    {issue.assignee && (
                      <div style={{ marginTop: spacing.sm, fontSize: '12px', color: colors.secondary }}>
                        {issue.assignee}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedIssueId && (
        <div style={{ position: 'relative', width: '400px', flexShrink: 0 }}>
          <IssueDetail
            issueId={selectedIssueId}
            onClose={() => setSelectedIssueId(null)}
            onUpdate={fetchBoard}
          />
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
