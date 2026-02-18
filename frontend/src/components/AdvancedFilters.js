import React, { useState, useEffect } from 'react';
import { FunnelIcon, StarIcon, ShareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import api from '../services/api';

export const FilterBuilder = ({ projectId, onApply }) => {
  const [query, setQuery] = useState({});
  const [showSave, setShowSave] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleApply = async () => {
    try {
      const response = await api.post('/api/agile/filter-issues/', { query, project_id: projectId });
      onApply?.(response.data);
    } catch (error) {
      console.error('Failed to filter:', error);
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/agile/saved-filters/', {
        name: filterName,
        query,
        is_shared: false
      });
      setShowSave(false);
      setFilterName('');
    } catch (error) {
      console.error('Failed to save filter:', error);
    }
  };

  const updateQuery = (key, value) => {
    setQuery({ ...query, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FunnelIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Filter Issues</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            multiple
            onChange={(e) => updateQuery('status', Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="testing">Testing</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            multiple
            onChange={(e) => updateQuery('priority', Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
          <select
            multiple
            onChange={(e) => updateQuery('issue_type', Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="epic">Epic</option>
            <option value="story">Story</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="subtask">Sub-task</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Text Search</label>
          <input
            type="text"
            placeholder="Search in title, description..."
            onChange={(e) => updateQuery('text', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          Apply Filter
        </button>
        <button
          onClick={() => setShowSave(!showSave)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Save Filter
        </button>
        <button
          onClick={() => setQuery({})}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Clear
        </button>
      </div>

      {showSave && (
        <div className="p-4 border border-gray-200 rounded-lg space-y-3">
          <input
            type="text"
            placeholder="Filter name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export const SavedFilters = ({ onSelect }) => {
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const response = await api.get('/api/agile/saved-filters/');
      setFilters(response.data);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const handleToggleFavorite = async (filterId, isFavorite) => {
    try {
      await api.put(`/api/agile/saved-filters/${filterId}/`, { is_favorite: !isFavorite });
      loadFilters();
    } catch (error) {
      console.error('Failed to update filter:', error);
    }
  };

  const handleDelete = async (filterId) => {
    if (!window.confirm('Delete this filter?')) return;
    try {
      await api.delete(`/api/agile/saved-filters/${filterId}/`);
      loadFilters();
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Saved Filters</h3>
      {filters.length === 0 ? (
        <p className="text-sm text-gray-500">No saved filters</p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelect?.(filter.query)}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(filter.id, filter.is_favorite);
                  }}
                  className="p-1"
                >
                  {filter.is_favorite ? (
                    <StarIconSolid className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <StarIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <span className="font-medium text-gray-900">{filter.name}</span>
                {filter.is_shared && <ShareIcon className="w-4 h-4 text-blue-500" />}
              </div>
              {filter.is_owner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(filter.id);
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const QuickFilters = ({ boardId, onApply }) => {
  const [filters, setFilters] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    loadFilters();
  }, [boardId]);

  const loadFilters = async () => {
    try {
      const response = await api.get(`/api/agile/boards/${boardId}/filters/`);
      setFilters(response.data);
    } catch (error) {
      console.error('Failed to load board filters:', error);
    }
  };

  const handleApply = (filter) => {
    setActiveFilter(filter.id === activeFilter ? null : filter.id);
    onApply?.(filter.id === activeFilter ? null : filter.criteria);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Quick Filters:</span>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => handleApply(filter)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            activeFilter === filter.id
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {filter.name}
        </button>
      ))}
    </div>
  );
};
