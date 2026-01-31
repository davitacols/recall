import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function KanbanBoard() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueColumn, setNewIssueColumn] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchBoard();
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [boardId]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/boards/${boardId}/`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'issue_moved') {
        fetchBoard();
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

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
      
      // Update UI immediately (optimistic update)
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: prevBoard.columns.map(col => ({
          ...col,
          issues: col.id === column.id 
            ? [...col.issues, draggedIssue]
            : col.issues.filter(i => i.id !== draggedIssue.id),
          issue_count: col.id === column.id 
            ? col.issue_count + 1
            : col.issue_count - 1
        }))
      }));
      
      setDraggedIssue(null);
      
      // Send to server in background
      await api.put(`/api/agile/issues/${draggedIssue.id}/`, {
        status: status,
      });
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'issue_moved',
          issue_id: draggedIssue.id,
          column_id: column.id,
          status: status
        }));
      }
    } catch (error) {
      console.error('Failed to move issue:', error);
      setDraggedIssue(null);
      await fetchBoard();
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
      await fetchBoard();
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Delete this issue?')) return;

    try {
      await api.delete(`/api/agile/issues/${issueId}/`);
      await fetchBoard();
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">{board.name}</h1>
          <p className="text-gray-600">Project: {board.project_name}</p>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {board.columns && board.columns.map((column) => (
            <div
              key={column.id}
              className="bg-white rounded-lg border border-gray-200 flex flex-col h-full"
            >
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{column.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{column.issue_count} issues</p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
                className="flex-1 p-4 space-y-3 overflow-y-auto"
              >
                {column.issues && column.issues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    className="p-4 bg-gray-50 border border-gray-200 rounded cursor-move hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-600 uppercase">{issue.key}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{issue.title}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteIssue(issue.id)}
                        className="ml-2 p-1 hover:bg-red-100 text-red-600 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {issue.assignee && (
                      <p className="text-xs text-gray-600 mt-2">Assigned: {issue.assignee}</p>
                    )}
                    {issue.story_points && (
                      <p className="text-xs text-gray-600 mt-1">{issue.story_points} pts</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setNewIssueColumn(column.id);
                    setShowCreateIssue(true);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-900 hover:bg-gray-50 font-bold uppercase text-sm transition-all flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Issue</h2>
            <input
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="Issue title"
              className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none mb-6"
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
                className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIssue}
                className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
