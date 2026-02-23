import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function TasksBoard() {
  const { darkMode } = useTheme();
  const [board, setBoard] = useState({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', status: 'todo', goal_id: '', conversation_id: '', decision_id: '' });

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
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/board/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('API Error:', res.status, await res.text());
        setBoard({ todo: [], in_progress: [], done: [] });
        return;
      }
      const data = await res.json();
      setBoard(data);
    } catch (error) {
      console.error('Error fetching board:', error);
      setBoard({ todo: [], in_progress: [], done: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ title: '', description: '', priority: 'medium', status: 'todo', goal_id: '', conversation_id: '', decision_id: '' });
      fetchBoard();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/tasks/${taskId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchBoard();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const priorityColors = {
    low: darkMode ? 'text-stone-500 bg-stone-500/20' : 'text-gray-500 bg-gray-500/20',
    medium: darkMode ? 'text-yellow-400 bg-yellow-400/20' : 'text-yellow-600 bg-yellow-600/20',
    high: darkMode ? 'text-red-400 bg-red-400/20' : 'text-red-600 bg-red-600/20'
  };

  const columns = [
    { key: 'todo', title: 'To Do', color: darkMode ? 'border-stone-600' : 'border-gray-400' },
    { key: 'in_progress', title: 'In Progress', color: darkMode ? 'border-blue-600' : 'border-blue-500' },
    { key: 'done', title: 'Done', color: darkMode ? 'border-green-600' : 'border-green-500' }
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="space-y-3">
                <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                  <div className={`h-4 ${inputBg} rounded w-1/2 mb-2`}></div>
                  <div className={`h-3 ${inputBg} rounded w-1/4`}></div>
                </div>
                {[1,2].map(j => (
                  <div key={j} className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                    <div className={`h-3 ${inputBg} rounded w-3/4 mb-2`}></div>
                    <div className={`h-3 ${inputBg} rounded w-1/2`}></div>
                  </div>
                ))}
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
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Tasks Board</h1>
            <p className={`text-sm ${textSecondary}`}>Manage your tasks with a simple board</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Task
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(column => (
            <div key={column.key} className="space-y-3">
              <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg border-l-4 ${column.color}`}>
                <h2 className={`text-base font-semibold ${textPrimary}`}>{column.title}</h2>
                <span className={`text-xs ${textSecondary}`}>{board[column.key].length} tasks</span>
              </div>
              
              <div className="space-y-3">
                {board[column.key].map(task => (
                  <div
                    key={task.id}
                    className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg ${hoverBorder} transition-all`}
                  >
                    <h3 className={`text-sm font-medium ${textPrimary} mb-3`}>{task.title}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.assigned_to && (
                        <span className={`text-xs ${textSecondary}`}>{task.assigned_to.full_name}</span>
                      )}
                    </div>
                    {column.key !== 'done' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, column.key === 'todo' ? 'in_progress' : 'done')}
                        className={`w-full py-2 text-xs ${textSecondary} border ${borderColor} rounded ${hoverBg} transition-all`}
                      >
                        Move to {column.key === 'todo' ? 'In Progress' : 'Done'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-5`}>Create New Task</h2>
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
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
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
                    Create Task
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
