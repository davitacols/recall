import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function Templates() {
  const { darkMode } = useTheme();
  const { addToast, confirm } = useToast();
  const [templates, setTemplates] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', template_type: 'goal', content: {} });

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await api.get('/api/business/templates/');
      setTemplates(res.data);
    } catch (error) {
      addToast('Failed to load templates', 'error');
    }
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/business/templates/', formData);
      setShowModal(false);
      setFormData({ name: '', template_type: 'goal', content: {} });
      loadTemplates();
      addToast('Template created', 'success');
    } catch (error) {
      addToast('Failed to create template', 'error');
    }
  };

  const deleteTemplate = (id) => {
    confirm('Delete this template?', async () => {
      try {
        await api.delete(`/api/business/templates/${id}/`);
        setTemplates(templates.filter(t => t.id !== id));
        addToast('Template deleted', 'success');
      } catch (error) {
        addToast('Failed to delete template', 'error');
      }
    });
  };

  const filteredTemplates = filterType === 'all' ? templates : templates.filter(t => t.template_type === filterType);

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>Templates</h1>
          <p style={{ fontSize: '14px', color: secondaryText }}>Reusable templates for goals, meetings, and tasks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}
        >
          <PlusIcon style={{ width: '16px', height: '16px' }} />
          New Template
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="all">All Types</option>
          <option value="goal">Goal Templates</option>
          <option value="meeting">Meeting Templates</option>
          <option value="task">Task Templates</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, border: `1px solid ${borderColor}`, borderRadius: '3px', color: textColor, textTransform: 'capitalize' }}>
                {template.template_type}
              </span>
              <button
                onClick={() => deleteTemplate(template.id)}
                style={{ padding: '4px', backgroundColor: 'transparent', border: `1px solid #ef4444`, color: '#ef4444', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
              >
                <TrashIcon style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>{template.name}</h3>
            <p style={{ fontSize: '12px', color: secondaryText }}>Created by {template.created_by || 'Unknown'}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: bgColor, borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '20px' }}>New Template</h2>
            <form onSubmit={createTemplate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Type</label>
                <select
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="goal">Goal</option>
                  <option value="meeting">Meeting</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Content (JSON)</label>
                <textarea
                  value={JSON.stringify(formData.content, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, content: JSON.parse(e.target.value) });
                    } catch {}
                  }}
                  rows={6}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '12px', fontFamily: 'monospace', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', backgroundColor: 'transparent', border: `1px solid ${borderColor}`, color: textColor, borderRadius: '5px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#3b82f6', border: 'none', color: '#ffffff', borderRadius: '5px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
