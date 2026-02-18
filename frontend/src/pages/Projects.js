import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { CardSkeleton } from '../components/Skeleton';
import { NoData } from '../components/EmptyState';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', key: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/agile/projects/');
      setProjects(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!formData.key.trim()) {
      setError('Project key is required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/agile/projects/', formData);
      setShowCreateForm(false);
      setFormData({ name: '', key: '', description: '' });
      fetchProjects();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create project';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-100 mb-2">Projects</h1>
            <p className="text-sm text-stone-500">Manage your projects and boards</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setError('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-stone-200 rounded hover:bg-stone-700 font-medium text-sm transition-all border border-stone-700"
          >
            <PlusIcon className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 border border-stone-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-stone-100 mb-5">Create New Project</h2>

              {error && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-800 text-red-400 text-sm mb-4 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mobile App"
                    className="w-full px-3 py-2 bg-stone-800 text-stone-200 border border-stone-700 rounded focus:outline-none focus:border-stone-600 transition-all"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">
                    Project Key *
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                    placeholder="e.g., MOBILE"
                    maxLength="10"
                    className="w-full px-3 py-2 bg-stone-800 text-stone-200 border border-stone-700 rounded focus:outline-none focus:border-stone-600 transition-all"
                    disabled={submitting}
                  />
                  <p className="text-xs text-stone-600 mt-1">Used for issue IDs (e.g., MOBILE-1, MOBILE-2)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project description..."
                    rows="4"
                    className="w-full px-3 py-2 bg-stone-800 text-stone-200 border border-stone-700 rounded focus:outline-none focus:border-stone-600 transition-all"
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setError('');
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-stone-800 text-stone-300 border border-stone-700 rounded hover:bg-stone-700 font-medium text-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-stone-700 text-stone-100 rounded hover:bg-stone-600 font-medium text-sm transition-all disabled:opacity-50 border border-stone-600 flex items-center gap-2"
                  >
                    {submitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 ? (
          <NoData type="projects" onCreate={() => { setShowCreateForm(true); setError(''); }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="no-underline"
              >
                <div className="p-6 bg-stone-900 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900/80 transition-all h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-stone-200 font-bold text-base border border-stone-700">
                      {project.key.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-stone-100">{project.name}</h3>
                      <p className="text-xs text-stone-500 font-mono">{project.key}</p>
                    </div>
                  </div>
                  <p className="text-stone-400 text-sm mb-4 flex-1">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex justify-between text-xs text-stone-500 pt-4 border-t border-stone-800">
                    <span>{project.issue_count} Issues</span>
                    <span>Lead: {project.lead || 'Unassigned'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Projects;
