import React, { useState } from 'react';
import api from '../services/api';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function WatchButton({ issueId, isWatching: initialWatching }) {
  const [isWatching, setIsWatching] = useState(initialWatching);
  const [loading, setLoading] = useState(false);

  const toggleWatch = async () => {
    setLoading(true);
    try {
      if (isWatching) {
        await api.delete(`/api/agile/issues/${issueId}/unwatch/`);
        setIsWatching(false);
      } else {
        await api.post(`/api/agile/issues/${issueId}/watch/`);
        setIsWatching(true);
      }
    } catch (error) {
      console.error('Failed to toggle watch:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleWatch}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border transition-all ${
        isWatching
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-900 border-gray-300 hover:border-gray-900'
      }`}
    >
      {isWatching ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
      {loading ? 'Loading...' : isWatching ? 'Watching' : 'Watch'}
    </button>
  );
}

export default WatchButton;
