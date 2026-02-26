import React, { useState, useEffect } from 'react';
import axios from 'axios';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const DeveloperTools = ({ conversationId }) => {
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [adrContent, setAdrContent] = useState(null);
  const [plainLanguage, setPlainLanguage] = useState(null);
  const [codeLink, setCodeLink] = useState({ title: '', url: '', type: 'pr' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/conversations/templates/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const exportADR = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/api/conversations/${conversationId}/export-adr/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdrContent(response.data);
      
      // Download file
      const blob = new Blob([response.data.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      a.click();
    } catch (error) {
      console.error('Error exporting ADR:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlainLanguage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/api/conversations/${conversationId}/plain-language/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlainLanguage(response.data.plain_language_summary);
    } catch (error) {
      console.error('Error generating plain language:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCodeLink = async () => {
    if (!codeLink.title || !codeLink.url) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/conversations/${conversationId}/code-links/`,
        codeLink,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCodeLink({ title: '', url: '', type: 'pr' });
      alert('Code link added!');
    } catch (error) {
      console.error('Error adding code link:', error);
    }
  };

  return (
    <div className="border-2 border-black p-6 bg-white mt-6">
      <h3 className="text-xl font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-4">
        DEVELOPER TOOLS
      </h3>

      {/* Export ADR */}
      <div className="mb-6">
        <button
          onClick={exportADR}
          disabled={loading}
          className="bg-black text-white px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-gray-800 transition-colors border-2 border-black disabled:opacity-50"
        >
          {loading ? 'EXPORTING...' : 'EXPORT AS ADR'}
        </button>
        <p className="text-xs text-gray-600 mt-2">
          Download as Architecture Decision Record (markdown)
        </p>
      </div>

      {/* Plain Language */}
      <div className="mb-6">
        <button
          onClick={generatePlainLanguage}
          disabled={loading}
          className="bg-white text-black px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black disabled:opacity-50"
        >
          {loading ? 'GENERATING...' : 'EXPLAIN LIKE I\'M NEW'}
        </button>
        {plainLanguage && (
          <div className="mt-3 p-4 bg-gray-50 border-2 border-gray-300">
            <p className="text-sm text-gray-800">{plainLanguage}</p>
          </div>
        )}
      </div>

      {/* Add Code Link */}
      <div className="mb-6">
        <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-3">
          ADD CODE LINK
        </h4>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Title (e.g., PR #123)"
            value={codeLink.title}
            onChange={(e) => setCodeLink({ ...codeLink, title: e.target.value })}
            className="w-full px-3 py-2 border-2 border-black text-sm"
          />
          <input
            type="url"
            placeholder="URL"
            value={codeLink.url}
            onChange={(e) => setCodeLink({ ...codeLink, url: e.target.value })}
            className="w-full px-3 py-2 border-2 border-black text-sm"
          />
          <select
            value={codeLink.type}
            onChange={(e) => setCodeLink({ ...codeLink, type: e.target.value })}
            className="w-full px-3 py-2 border-2 border-black text-sm"
          >
            <option value="pr">Pull Request</option>
            <option value="commit">Commit</option>
            <option value="doc">Documentation</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={addCodeLink}
            className="bg-black text-white px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-gray-800 transition-colors border-2 border-black"
          >
            ADD LINK
          </button>
        </div>
      </div>

      {/* Templates */}
      <div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="bg-white text-black px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black"
        >
          {showTemplates ? 'HIDE' : 'SHOW'} TEMPLATES
        </button>
        {showTemplates && (
          <div className="mt-3 space-y-2">
            {templates.map((template) => (
              <div key={template.key} className="p-3 border-2 border-gray-300 hover:border-black transition-colors">
                <div className="font-['League_Spartan'] uppercase text-xs tracking-wider text-black font-bold">
                  {template.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Type: {template.post_type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperTools;



