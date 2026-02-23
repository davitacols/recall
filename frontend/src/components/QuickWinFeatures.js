import React, { useState } from 'react';
import { StarIcon, ArrowDownTrayIcon, EnvelopeIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

// Favorites Component
export const FavoriteButton = ({ conversationId, decisionId, onToggle }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggle = async () => {
    try {
      const response = await api.post('/api/recall/favorites/toggle/', {
        conversation_id: conversationId,
        decision_id: decisionId,
      });
      setIsFavorite(response.data.is_favorite);
      onToggle?.(response.data.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded ${isFavorite ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}`}
      title="Add to favorites"
    >
      <StarIcon className="w-5 h-5" />
    </button>
  );
};

// Bulk Actions Component
export const BulkActionBar = ({ selectedIds, onExecute }) => {
  const [actionType, setActionType] = useState('');
  const [changes, setChanges] = useState({});

  const handleExecute = async () => {
    try {
      await api.post('/api/recall/bulk-actions/execute/', {
        action_type: actionType,
        item_ids: selectedIds,
        changes,
      });
      onExecute?.();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  return (
    <div className="flex gap-2 p-4 bg-blue-50 border border-blue-200 rounded">
      <select
        value={actionType}
        onChange={(e) => setActionType(e.target.value)}
        className="px-3 py-2 border rounded"
      >
        <option value="">Select action...</option>
        <option value="update_status">Update Status</option>
        <option value="add_tag">Add Tag</option>
        <option value="archive">Archive</option>
      </select>
      <input
        type="text"
        placeholder="Value"
        onChange={(e) => setChanges({ ...changes, value: e.target.value })}
        className="px-3 py-2 border rounded flex-1"
      />
      <button
        onClick={handleExecute}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Apply to {selectedIds.length} items
      </button>
    </div>
  );
};

// Export to PDF Component
export const ExportButton = ({ conversationId, decisionId, type }) => {
  const handleExport = async () => {
    try {
      const endpoint = type === 'conversation' 
        ? `/api/recall/export/conversation-pdf/?id=${conversationId}`
        : `/api/recall/export/decision-pdf/?id=${decisionId}`;
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${conversationId || decisionId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="p-2 border-2 border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400 rounded hover:bg-gray-600 hover:text-white dark:hover:bg-gray-400 dark:hover:text-gray-900 transition"
      title="Export PDF"
    >
      <ArrowDownTrayIcon className="w-4 h-4" />
    </button>
  );
};

// Email Digest Component
export const EmailDigestSettings = () => {
  const [frequency, setFrequency] = useState('weekly');
  const [enabled, setEnabled] = useState(true);

  const handleSave = async () => {
    try {
      await api.post('/api/recall/email-digest/update-settings/', {
        frequency,
        enabled,
      });
      alert('Email digest settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <EnvelopeIcon className="w-5 h-5" />
        Email Digest
      </h3>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable email digest
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

// Trending Topics Component
export const TrendingTopics = () => {
  const [topics, setTopics] = useState([]);

  React.useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await api.get('/api/recall/trending/topics/');
        setTopics(response.data);
      } catch (error) {
        console.error('Failed to fetch trending topics:', error);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <SparklesIcon className="w-5 h-5" />
        Trending Topics
      </h3>
      <div className="space-y-2">
        {topics.map((topic, idx) => (
          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-medium">{topic.topic}</span>
            <span className="text-sm text-gray-600">{topic.mentions} mentions</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Comment Threading Component
export const CommentThread = ({ conversationId, parentReplyId }) => {
  const [replies, setReplies] = useState([]);
  const [newComment, setNewComment] = useState('');

  const handleAddReply = async () => {
    try {
      const response = await api.post('/api/recall/comments/create-thread/', {
        conversation_id: conversationId,
        content: newComment,
        parent_id: parentReplyId,
      });
      setReplies([...replies, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  React.useEffect(() => {
    const fetchThread = async () => {
      try {
        const response = await api.get(`/api/recall/comments/thread/?id=${parentReplyId}`);
        setReplies(response.data);
      } catch (error) {
        console.error('Failed to fetch thread:', error);
      }
    };
    if (parentReplyId) fetchThread();
  }, [parentReplyId]);

  return (
    <div className="space-y-3 ml-4 border-l-2 border-gray-200 pl-4">
      {replies.map((reply) => (
        <div key={reply.id} className="p-2 bg-gray-50 rounded">
          <p className="text-sm font-medium">{reply.author}</p>
          <p className="text-sm text-gray-700">{reply.content}</p>
          <p className="text-xs text-gray-500">{new Date(reply.created_at).toLocaleString()}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Reply..."
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleAddReply}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

// Decision Reminder Component
export const DecisionReminder = ({ decisionId }) => {
  const [days, setDays] = useState(30);

  const handleSetReminder = async () => {
    try {
      await api.post('/api/recall/decision-reminders/set-reminder/', {
        decision_id: decisionId,
        days,
      });
      alert('Reminder set');
    } catch (error) {
      console.error('Failed to set reminder:', error);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
      <label className="block text-sm font-medium mb-2 text-yellow-900 dark:text-yellow-200">
        Remind me in (days):
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="flex-1 px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded bg-white dark:bg-stone-900 text-gray-900 dark:text-stone-100"
          min="1"
        />
        <button
          onClick={handleSetReminder}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
        >
          Set
        </button>
      </div>
    </div>
  );
};

// Conversation Merge Component
export const ConversationMerge = ({ conversationId, onMerge }) => {
  const [targetId, setTargetId] = useState('');

  const handleMerge = async () => {
    try {
      const response = await api.post('/api/recall/conversations/merge/', {
        source_id: conversationId,
        target_id: targetId,
      });
      onMerge?.(response.data.target_id);
    } catch (error) {
      console.error('Failed to merge:', error);
    }
  };

  return (
    <div className="p-3 border rounded">
      <label className="block text-sm font-medium mb-2">
        Merge with conversation ID:
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          placeholder="Target conversation ID"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleMerge}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Merge
        </button>
      </div>
    </div>
  );
};

// Undo/Redo Component
export const UndoRedoButtons = () => {
  const handleUndo = async () => {
    try {
      await api.post('/api/recall/undo-redo/undo/');
    } catch (error) {
      console.error('Undo failed:', error);
    }
  };

  const handleRedo = async () => {
    try {
      await api.post('/api/recall/undo-redo/redo/');
    } catch (error) {
      console.error('Redo failed:', error);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleUndo}
        className="px-3 py-1.5 border-2 border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400 rounded hover:bg-gray-600 hover:text-white dark:hover:bg-gray-400 dark:hover:text-gray-900 transition text-sm font-medium"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={handleRedo}
        className="px-3 py-1.5 border-2 border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400 rounded hover:bg-gray-600 hover:text-white dark:hover:bg-gray-400 dark:hover:text-gray-900 transition text-sm font-medium"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  );
};
