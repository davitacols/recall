import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows, motion } from '../utils/designTokens';
import IssueDetail from './IssueDetail';

function KanbanBoard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      const res = await api.get(`/api/agile/boards/${boardId}/`);
      setBoard(res.data);
      setColumns(res.data.columns || []);
      
      const allIssues = [];
      res.data.columns.forEach(col => {
        col.issues.forEach(issue => {
          allIssues.push({ ...issue, column_id: col.id });
        });
      });
      setIssues(allIssues);
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

    const statusMap = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'In Review': 'in_review',
      'Done': 'done'
    };

    const column = columns.find(c => c.id === columnId);
    const newStatus = statusMap[column?.name] || 'todo';

    try {
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, {
        status: newStatus
      });
      
      setDraggedIssue(null);
      await fetchBoard();
    } catch (error) {
      console.error('Failed to move issue:', error);
    }
  };

  const getIssuesForColumn = (columnId) => {
    return issues.filter(i => i.column_id === columnId);
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

  const handleCreateIssue = () => {
    window.location.href = `/issues/new?boardId=${boardId}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: colors.primary, margin: 0 }}>
          {board.name}
        </h1>
        <button
          onClick={handleCreateIssue}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.surface,
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
            transition: motion.fast,
            boxShadow: shadows.sm
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#1a1f35';
            e.target.style.boxShadow = shadows.md;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = colors.primary;
            e.target.style.boxShadow = shadows.sm;
          }}
        >
          + New Issue
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: spacing.lg,
        overflowX: 'auto',
        paddingBottom: spacing.lg
      }}>
        {columns.map(column => (
          <div
            key={column.id}
            style={{
              backgroundColor: colors.background,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              minWidth: '300px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: spacing.lg,
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, margin: 0 }}>
                {column.name}
              </h3>
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: colors.secondary,
                backgroundColor: colors.surface,
                padding: `${spacing.sm} ${spacing.md}`,
                borderRadius: radius.md
              }}>
                {getIssuesForColumn(column.id).length}
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{
                flex: 1,
                padding: spacing.md,
                display: 'flex',
                flexDirection: 'column',
                gap: spacing.md,
                minHeight: '400px',
                backgroundColor: draggedIssue ? colors.accentLight : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              {getIssuesForColumn(column.id).map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onDragStart={handleDragStart}
                  onClick={() => setSelectedIssueId(issue.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedIssueId && (
        <IssueDetail
          issueId={selectedIssueId}
          onClose={() => {
            setSelectedIssueId(null);
            fetchBoard();
          }}
          onUpdate={fetchBoard}
        />
      )}
    </div>
  );
}

function IssueCard({ issue, onDragStart, onClick }) {
  const statusColors = {
    todo: '#6B7280',
    in_progress: '#F59E0B',
    in_review: '#3B82F6',
    done: '#10B981'
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, issue)}
      onClick={onClick}
      style={{
        padding: spacing.md,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: shadows.sm,
        borderLeft: `3px solid ${statusColors[issue.status] || colors.primary}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.md;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadows.sm;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 600, color: colors.secondary, marginBottom: '4px' }}>
        {issue.key}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
        {issue.title}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: colors.secondary }}>
          {issue.assignee ? `👤 ${issue.assignee}` : 'Unassigned'}
        </div>
        {issue.story_points && (
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: colors.background,
            padding: `2px ${spacing.sm}`,
            borderRadius: '2px',
            color: colors.primary
          }}>
            {issue.story_points}pts
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanBoard;
