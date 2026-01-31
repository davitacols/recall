import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function ProjectRoadmap() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Project not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-5xl font-black text-gray-900 mb-4">{project.name} Roadmap</h1>
        <p className="text-lg text-gray-600 mb-12">Project roadmap and timeline</p>

        {project.sprints && project.sprints.length > 0 ? (
          <div className="space-y-8">
            {project.sprints.map((sprint) => (
              <div key={sprint.id} className="border border-gray-200 p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{sprint.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{sprint.start_date} to {sprint.end_date}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                    sprint.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {sprint.status}
                  </span>
                </div>
                {sprint.goal && (
                  <p className="text-gray-700 mb-4">{sprint.goal}</p>
                )}
                <div className="flex gap-6 text-sm text-gray-600">
                  <div>{sprint.issue_count} issues</div>
                  <div>{sprint.completed_count} completed</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-gray-200">
            <p className="text-gray-600">No sprints planned yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectRoadmap;
