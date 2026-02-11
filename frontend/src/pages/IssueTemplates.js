import React, { useState, useEffect } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function IssueTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issue_type: 'task',
    title_template: '',
    description_template: '',
    default_priority: 'medium'
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/api/agile/templates/');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/agile/templates/', formData);
      setShowForm(false);
      setFormData({
        name: '',
        issue_type: 'task',
        title_template: '',
        description_template: '',
        default_priority: 'medium'
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
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
          <h1 className="text-4xl font-black text-gray-900">Issue Templates</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm"
          >
            <DocumentTextIcon className="w-4 h-4" />
            New Template
          </button>
        </div>

        {showForm && (
          <div className="mb-8 p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Create Template</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Template Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                  className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                >
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                </select>
                <select
                  value={formData.default_priority}
                  onChange={(e) => setFormData({ ...formData, default_priority: e.target.value })}
                  className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                >
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Title Template (e.g., [BUG] )"
                value={formData.title_template}
                onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                required
              />
              <textarea
                placeholder="Description Template"
                value={formData.description_template}
                onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-32"
                required
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

        <div className="grid grid-cols-2 gap-4">
          {templates.map(template => (
            <div key={template.id} className="p-6 border border-gray-200 hover:border-gray-900 transition-all">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-900">{template.name}</h3>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 font-semibold rounded">
                  {template.issue_type}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{template.title_template}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{template.description_template}</p>
              <p className="text-xs text-gray-600 mt-3">Priority: {template.default_priority}</p>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="col-span-2 text-center text-gray-600 py-12">
              No templates yet. Create one to speed up issue creation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueTemplates;
