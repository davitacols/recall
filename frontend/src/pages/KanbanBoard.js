import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function KanbanBoard() {
  const { projectId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, [projectId]);

  const fetchBoard = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/board/`);
      setBoard(response.data);
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (issue) => {
    setDraggedIssue(issue);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Board not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full px-4 md:px-8 py-12">
        <h1 className="text-5xl font-black text-gray-900 mb-12">{board.name}</h1>

        <div className="flex gap-6 overflow-x-auto pb-6">
          {board.columns.map(column => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-bold text-gray-900 uppercase text-sm tracking-wide">{column.name}</h2>
                <p className="text-xs text-gray-600 mt-1">{column.issues.length} issues</p>
              </div>

              {/* Issues */}
              <div
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                className="p-4 space-y-3 min-h-96"
              >
                {column.issues.map(issue => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={() => handleDragStart(issue)}
                    className="p-4 bg-white border border-gray-200 rounded cursor-move hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 uppercase">{issue.key}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        issue.priority === 'highest' ? 'bg-red-100 text-red-700' :
                        issue.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {issue.priority}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">{issue.title}</h3>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{issue.assignee || 'Unassigned'}</span>
                      {issue.story_points && (
                        <span className="bg-gray-100 px-2 py-1 rounded">{issue.story_points} pts</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default KanbanBoard;
