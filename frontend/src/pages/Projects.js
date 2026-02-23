import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, FolderIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Projects() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', key: '', description: '' });
  const [loading, setLoading] = useState(true);

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-white';
  const inputBorder = darkMode ? 'border-stone-700' : 'border-gray-300';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/agile/projects/');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/agile/projects/', newProject);
      setShowCreate(false);
      setNewProject({ name: '', key: '', description: '' });
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-12 w-12 ${inputBg} rounded-lg mb-4`}></div>
                <div className={`h-5 ${inputBg} rounded w-3/4 mb-3`}></div>
                <div className={`h-4 ${inputBg} rounded w-full mb-2`}></div>
                <div className={`h-4 ${inputBg} rounded w-2/3`}></div>
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
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Projects</h1>
            <p className={`text-sm ${textSecondary}`}>Manage your team's projects and boards</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} hover:border-stone-700 font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Project
          </button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-5`}>Create Project</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${textPrimary} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Project Key</label>
                  <input
                    type="text"
                    required
                    value={newProject.key}
                    onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase() })}
                    placeholder="PROJ"
                    maxLength={10}
                    className={`w-full px-3 py-2 ${inputBg} ${textPrimary} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 ${inputBg} ${textPrimary} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className={`px-4 py-2 bg-transparent ${textSecondary} border-2 ${borderColor} rounded ${hoverBg} font-medium text-sm`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-transparent border-2 ${inputBorder} ${textPrimary} rounded ${hoverBg} hover:border-stone-700 font-medium text-sm`}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className={`text-center py-20 ${textSecondary}`}>
            <FolderIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No projects yet. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg cursor-pointer transition-all hover:border-stone-700 hover:-translate-y-1`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {project.key}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-1 truncate`}>{project.name}</h3>
                    {project.description && (
                      <p className={`text-sm ${textSecondary} line-clamp-2`}>{project.description}</p>
                    )}
                  </div>
                </div>
                <div className={`flex items-center justify-between pt-4 border-t ${borderColor} text-xs ${textSecondary}`}>
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{project.lead_name || 'No lead'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
