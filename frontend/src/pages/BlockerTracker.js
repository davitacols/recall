import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Blockers() {
  const [blockers, setBlockers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', type: 'technical', sprint_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [blockersRes, sprintsRes] = await Promise.all([
        api.get('/api/agile/blockers/'),
        api.get('/api/agile/sprint-history/')
      ]);
      setBlockers(blockersRes.data);
      setSprints(sprintsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlocker = async (e) => {
    e.preventDefault();
    if (!formData.sprint_id) {
      alert('Please select a sprint');
      return;
    }

    try {
      await api.post('/api/agile/blockers/', formData);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', type: 'technical', sprint_id: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create blocker:', error);
    }
  };

  const handleResolveBlocker = async (blockerId) => {
    try {
      await api.post(`/api/agile/blockers/${blockerId}/resolve/`);
      fetchData();
    } catch (error) {
      console.error('Failed to resolve blocker:', error);
    }
  };

  const filteredBlockers = selectedSprint
    ? blockers.filter(b => b.sprint_id === selectedSprint)
    : blockers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
              <h1 className="text-5xl font-black text-gray-900">Blockers</h1>
            </div>
            <p className="text-lg text-gray-600 font-light">Track and resolve sprint blockers</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            Report Blocker
          </button>
        </div>

        {/* Filter */}
        {sprints.length > 0 && (
          <div className="p-8 bg-white border border-gray-200 mb-12">
            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Filter by Sprint</label>
            <select
              value={selectedSprint || ''}
              onChange={(e) => setSelectedSprint(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full max-w-xs px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="">All Sprints</option>
              {sprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.sprint_name} ({sprint.project_name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Blockers List */}
        {filteredBlockers.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-200">
            <ExclamationTriangleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-3xl font-black text-gray-900 mb-3">No blockers</h3>
            <p className="text-lg text-gray-600 font-light mb-8">Great! No active blockers to resolve</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
            >
              Report First Blocker
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBlockers.map(blocker => (
              <div key={blocker.id} className="p-8 bg-white border-l-4 border-red-600 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        blocker.type === 'technical' ? 'bg-red-100 text-red-700' :
                        blocker.type === 'dependency' ? 'bg-orange-100 text-orange-700' :
                        blocker.type === 'decision' ? 'bg-purple-100 text-purple-700' :
                        blocker.type === 'resource' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {blocker.type}
                      </span>
                      <span className="text-xs text-gray-600 font-medium">{blocker.days_open} days open</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{blocker.title}</h3>
                    <p className="text-gray-600 mb-4">{blocker.description}</p>
                    <div className="flex gap-6 text-sm text-gray-600">
                      <span>Sprint: <strong>{blocker.sprint_name || 'Unassigned'}</strong></span>
                      <span>Reported by: <strong>{blocker.blocked_by}</strong></span>
                      {blocker.assigned_to && (
                        <span>Assigned to: <strong>{blocker.assigned_to}</strong></span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveBlocker(blocker.id)}
                    className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Blocker</h2>

              <form onSubmit={handleCreateBlocker} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Sprint *</label>
                  <select
                    value={formData.sprint_id}
                    onChange={(e) => setFormData({ ...formData, sprint_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    required
                  >
                    <option value="">Select a sprint</option>
                    {sprints.map(sprint => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.sprint_name} ({sprint.project_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What's blocking progress?"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  >
                    <option value="technical">Technical</option>
                    <option value="dependency">Dependency</option>
                    <option value="decision">Decision Needed</option>
                    <option value="resource">Resource</option>
                    <option value="external">External</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide context..."
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all min-h-24"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                  >
                    Report Blocker
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

export default Blockers;
