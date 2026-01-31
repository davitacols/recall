import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ActionItemManager({ conversationId, teamMembers }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    assignee: null,
    priority: 'medium',
    due_date: ''
  });

  useEffect(() => {
    fetchActionItems();
  }, [conversationId]);

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/conversations/${conversationId}/action-items/`);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    try {
      const response = await api.post(
        `/conversations/${conversationId}/action-items/`,
        newItem
      );
      setItems([...items, response.data]);
      setNewItem({
        title: '',
        description: '',
        assignee: null,
        priority: 'medium',
        due_date: ''
      });
    } catch (error) {
      console.error('Failed to create action item:', error);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const response = await api.put(`/action-items/${itemId}/`, updates);
      setItems(items.map(item => item.id === itemId ? response.data : item));
    } catch (error) {
      console.error('Failed to update action item:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/action-items/${itemId}/`);
      setItems(items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete action item:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Action Items</h3>

      {/* Create Form */}
      <form onSubmit={handleCreateItem} className="bg-gray-50 p-4 rounded-lg space-y-3">
        <input
          type="text"
          placeholder="Task title"
          value={newItem.title}
          onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
          className="w-full px-3 py-2 border rounded"
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm"
          rows="2"
        />
        <div className="grid grid-cols-3 gap-3">
          <select
            value={newItem.assignee || ''}
            onChange={(e) => setNewItem({ ...newItem, assignee: e.target.value ? parseInt(e.target.value) : null })}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">Assign to...</option>
            {teamMembers?.map(member => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
          <select
            value={newItem.priority}
            onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            type="date"
            value={newItem.due_date}
            onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
            className="px-3 py-2 border rounded text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Task
        </button>
      </form>

      {/* Items List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-sm">No action items yet</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      item.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.priority}
                    </span>
                    {item.assignee_name && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        👤 {item.assignee_name}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        📅 {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <select
                    value={item.status}
                    onChange={(e) => handleUpdateItem(item.id, { status: e.target.value })}
                    className="text-xs px-2 py-1 border rounded"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
