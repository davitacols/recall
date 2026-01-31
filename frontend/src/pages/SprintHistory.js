import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function SprintHistory() {
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, sprintsRes] = await Promise.all([
        api.get('/api/agile/projects/'),
        api.get('/api/agile/sprint-history/')
      ]);
      setProjects(projectsRes.data);
      setSprints(sprintsRes.data.results || sprintsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSprints = selectedProject
    ? sprints.filter(s => s.project_id === selectedProject)
    : sprints;

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
        <div className="mb-12">
          <h1 className="text-6xl font-black text-gray-900 mb-3 tracking-tight">Sprint History</h1>
          <p className="text-xl text-gray-600 font-light">Institutional memory for your team</p>
        </div>

        {/* Filter */}
        {projects.length > 0 && (
          <div className="p-8 bg-white border border-gray-200 mb-12">
            <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Filter by Project</label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full max-w-xs px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sprints List */}
        {filteredSprints.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-200">
            <h3 className="text-3xl font-black text-gray-900 mb-3">No past sprints</h3>
            <p className="text-lg text-gray-600 font-light">Sprint history will appear here once sprints are completed</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSprints.map(sprint => (
              <div key={sprint.id} className="p-8 bg-white border border-gray-200 hover:border-gray-900 hover:shadow-lg transition-all">
                {/* Sprint Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{sprint.name}</h2>
                    <p className="text-sm text-gray-600 font-medium">{sprint.project_name} • {sprint.start_date} to {sprint.end_date}</p>
                  </div>
                  <Link
                    to={`/sprints/${sprint.id}`}
                    className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
                  >
                    View Details
                  </Link>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="p-6 bg-white border border-gray-200 text-center">
                    <p className="text-3xl font-black text-green-600 mb-2">{sprint.completed}</p>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Completed</p>
                  </div>

                  <div className="p-6 bg-white border border-gray-200 text-center">
                    <p className="text-3xl font-black text-red-600 mb-2">{sprint.blocked}</p>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Blocked</p>
                  </div>

                  <div className="p-6 bg-white border border-gray-200 text-center">
                    <p className="text-3xl font-black text-gray-900 mb-2">{sprint.decisions}</p>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Decisions</p>
                  </div>
                </div>

                {/* Completion Bar */}
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-bold text-gray-900 uppercase tracking-wide">Completion</span>
                    <span className="text-sm font-bold text-gray-900">{sprint.completed}/{sprint.completed + sprint.blocked}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200">
                    <div
                      style={{
                        width: `${sprint.completed + sprint.blocked > 0 ? (sprint.completed / (sprint.completed + sprint.blocked)) * 100 : 0}%`
                      }}
                      className="h-full bg-green-600 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Projects Link */}
        <div className="mt-12">
          <a href="/projects" className="inline-block px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all">
            View All Projects →
          </a>
        </div>
      </div>
    </div>
  );
}

export default SprintHistory;
