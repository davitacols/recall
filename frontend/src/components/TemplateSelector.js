import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TemplateSelector = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/conversations/templates/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const loadTemplate = async (templateKey) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:8000/api/conversations/templates/${templateKey}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedTemplate(response.data);
      onSelectTemplate(response.data);
      setShowTemplates(false);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowTemplates(!showTemplates)}
        className="bg-white text-black px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black"
      >
        {showTemplates ? '✕ CLOSE' : '📋 USE TEMPLATE'}
      </button>

      {showTemplates && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <button
              key={template.key}
              onClick={() => loadTemplate(template.key)}
              className="text-left p-4 border-2 border-black hover:bg-gray-100 transition-colors"
            >
              <div className="font-['League_Spartan'] uppercase text-sm tracking-wider text-black font-bold mb-2">
                {template.name}
              </div>
              <div className="text-xs text-gray-600">
                Type: {template.post_type}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-300">
          <div className="text-xs font-['League_Spartan'] uppercase tracking-wider text-gray-600 mb-2">
            TEMPLATE LOADED: {selectedTemplate.name}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
