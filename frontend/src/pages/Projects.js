import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

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
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-16">
          <div>
            <h1 className="text-7xl font-black text-gray-900 mb-3 tracking-tight">Projects</h1>
            <p className="text-xl text-gray-600 font-light">Manage your projects and boards</p>
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setError('');
            }}
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5" />
            New Project
          </button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h2>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mobile App"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Project Key *
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                    placeholder="e.g., MOBILE"
                    maxLength="10"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-600 mt-2">Used for issue IDs (e.g., MOBILE-1, MOBILE-2)</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Project description..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setError('');
                    }}
                    disabled={submitting}
                    className="px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all disabled:opacity-50 flex items-center gap-2"
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
          <div className="text-center py-24 border border-gray-200 bg-white">
            <h3 className="text-3xl font-black text-gray-900 mb-3">No projects yet</h3>
            <p className="text-lg text-gray-600 mb-8">Create your first project to get started with Kanban boards</p>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setError('');
              }}
              className="px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="no-underline"
              >
                <div className="p-8 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gray-900 flex items-center justify-center text-white font-black text-lg">
                      {project.key.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                      <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">{project.key}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-6 flex-1 font-light">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex justify-between text-xs text-gray-600 font-medium uppercase tracking-wide pt-6 border-t border-gray-200">
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
