import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function KanbanBoard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueColumn, setNewIssueColumn] = useState(null);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getColumnColor = (name) => {
    switch (name) {
      case 'To Do': return 'border-t-4 border-t-slate-500';
      case 'In Progress': return 'border-t-4 border-t-blue-500';
      case 'In Review': return 'border-t-4 border-t-purple-500';
      case 'Done': return 'border-t-4 border-t-green-500';
      default: return 'border-t-4 border-t-gray-500';
    }
  };

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

  const handleDrop = async (e, column) => {
    e.preventDefault();
    if (!draggedIssue) return;

    const statusMap = {
      'To Do': 'todo',
      'In Progress': 'in_progress',
      'In Review': 'in_review',
      'Done': 'done',
    };

    try {
      const status = statusMap[column.name] || 'todo';
      const updatedIssue = { ...draggedIssue, status };
      
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: prevBoard.columns.map(col => {
          if (col.id === column.id) {
            return {
              ...col,
              issues: [...(col.issues || []), updatedIssue],
              issue_count: (col.issue_count || 0) + 1
            };
          }
          return {
            ...col,
            issues: (col.issues || []).filter(i => i.id !== draggedIssue.id),
            issue_count: Math.max(0, (col.issue_count || 0) - 1)
          };
        })
      }));
      
      setDraggedIssue(null);
      
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, {
        status: status,
      });
    } catch (error) {
      console.error('Failed to move issue:', error);
      setDraggedIssue(null);
      fetchBoard();
    }
  };

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !newIssueColumn) return;

    try {
      await api.post(`/api/agile/projects/${board.project_id}/issues/`, {
        title: newIssueTitle,
      });
      setNewIssueTitle('');
      setNewIssueColumn(null);
      setShowCreateIssue(false);
      fetchBoard();
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Delete this issue?')) return;

    try {
      await api.delete(`/api/agile/issues/${issueId}/`);
      fetchBoard();
    } catch (error) {
      console.error('Failed to delete issue:', error);
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
    return <div className="text-center py-20">Board not found</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-all border border-gray-600 bg-gray-800 shadow-sm"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white">{board.name}</h1>
              <p className="text-sm text-gray-300 mt-1">Project: {board.project_name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {board.columns && board.columns.map((column) => (
            <div
              key={column.id}
              className={`bg-gray-800 rounded-xl shadow-sm flex flex-col min-h-[600px] ${getColumnColor(column.name)}`}
            >
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">{column.name}</h2>
                  <span className="px-2.5 py-1 bg-gray-700 text-gray-200 text-xs font-bold rounded-full">
                    {column.issue_count}
                  </span>
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
                className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto min-h-[400px]"
              >
                {column.issues && column.issues.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                    No issues
                  </div>
                )}
                {column.issues && column.issues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="group p-3.5 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 hover:border-gray-500 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-gray-400 uppercase">{issue.key}</span>
                          {issue.priority && (
                            <span className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)}`} title={issue.priority}></span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{issue.title}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIssue(issue.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900 text-red-400 rounded-md transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-600">
                      <div className="flex items-center gap-2">
                        {issue.assignee && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {issue.assignee.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-[80px]">{issue.assignee}</span>
                          </div>
                        )}
                      </div>
                      {issue.story_points && (
                        <span className="px-2 py-0.5 bg-indigo-600 text-indigo-200 text-xs font-bold rounded">
                          {issue.story_points} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setNewIssueColumn(column.id);
                    setShowCreateIssue(true);
                  }}
                  className="w-full px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 border border-gray-600 hover:border-gray-500"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Issue
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateIssue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Issue</h2>
            <input
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="Enter issue title..."
              autoFocus
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none mb-6 transition-all"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreateIssue();
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateIssue(false);
                  setNewIssueTitle('');
                  setNewIssueColumn(null);
                }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIssue}
                disabled={!newIssueTitle.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                Create Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
