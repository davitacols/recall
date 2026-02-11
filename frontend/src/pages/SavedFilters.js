import React, { useState, useEffect } from 'react';
import { FunnelIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function SavedFilters() {
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    is_public: false,
    filter_params: {}
  });

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await api.get('/api/agile/filters/');
      setFilters(response.data);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/agile/filters/', formData);
      setShowForm(false);
      setFormData({ name: '', is_public: false, filter_params: {} });
      fetchFilters();
    } catch (error) {
      console.error('Failed to create filter:', error);
    }
  };

  const handleDelete = async (filterId) => {
    if (!window.confirm('Delete this filter?')) return;
    try {
      await api.delete(`/api/agile/filters/${filterId}/`);
      fetchFilters();
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-gray-900">Saved Filters</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm"
          >
            <FunnelIcon className="w-4 h-4" />
            New Filter
          </button>
        </div>

        {showForm && (
          <div className="mb-8 p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Create Filter</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Filter Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                required
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
                <span className="text-sm font-medium">Make this filter public</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-bold text-sm">
                  Create
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {filters.map(filter => (
            <div key={filter.id} className="p-4 border border-gray-200 hover:border-gray-900 transition-all flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">{filter.name}</h3>
                <p className="text-sm text-gray-600">
                  {filter.is_public ? 'Public' : 'Private'} • Created by {filter.user_name}
                </p>
              </div>
              <button
                onClick={() => handleDelete(filter.id)}
                className="p-2 text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
          {filters.length === 0 && (
            <p className="text-center text-gray-600 py-12">No saved filters yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SavedFilters;
