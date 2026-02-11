import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Releases() {
  const { projectId } = useParams();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    release_date: '',
    status: 'unreleased',
    description: ''
  });

  useEffect(() => {
    fetchReleases();
  }, [projectId]);

  const fetchReleases = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/releases/`);
      setReleases(response.data);
    } catch (error) {
      console.error('Failed to fetch releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/agile/projects/${projectId}/releases/`, formData);
      setShowForm(false);
      setFormData({ name: '', version: '', release_date: '', status: 'unreleased', description: '' });
      fetchReleases();
    } catch (error) {
      console.error('Failed to create release:', error);
    }
  };

  const updateStatus = async (releaseId, status) => {
    try {
      await api.patch(`/api/agile/releases/${releaseId}/`, { status });
      fetchReleases();
    } catch (error) {
      console.error('Failed to update release:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">
      <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black text-gray-900">Releases</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            New Release
          </button>
        </div>

        {showForm && (
          <div className="mb-8 p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Create Release</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Release Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  required
                />
                <input
                  type="text"
                  placeholder="Version (e.g., 1.0.0)"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  required
                />
              </div>
              <input
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-24"
              />
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

        <div className="space-y-4">
          {releases.map(release => (
            <div key={release.id} className="p-6 border border-gray-200 hover:border-gray-900 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{release.name}</h3>
                  <p className="text-gray-600">Version {release.version}</p>
                </div>
                <select
                  value={release.status}
                  onChange={(e) => updateStatus(release.id, e.target.value)}
                  className={`px-3 py-1 text-sm font-bold border-0 ${
                    release.status === 'released' ? 'bg-green-100 text-green-700' :
                    release.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  <option value="unreleased">Unreleased</option>
                  <option value="released">Released</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              {release.description && <p className="text-gray-600 mb-4">{release.description}</p>}
              {release.release_date && (
                <p className="text-sm text-gray-600">Release Date: {new Date(release.release_date).toLocaleDateString()}</p>
              )}
            </div>
          ))}
          {releases.length === 0 && (
            <p className="text-center text-gray-600 py-12">No releases yet. Create one to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Releases;
