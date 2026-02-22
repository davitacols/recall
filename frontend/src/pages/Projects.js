import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, FolderIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Projects() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', key: '', description: '' });
  const [loading, setLoading] = useState(true);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const cardBg = darkMode ? '#0c0a09' : '#ffffff';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

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
    return <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>Projects</h1>
          <p style={{ fontSize: '15px', color: secondaryText }}>Manage your team's projects and boards</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          New Project
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: bgColor, borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Create Project</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Project Name</label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Project Key</label>
                <input
                  type="text"
                  required
                  value={newProject.key}
                  onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toUpperCase() })}
                  placeholder="PROJ"
                  maxLength={10}
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{ padding: '12px 20px', border: `1px solid ${borderColor}`, borderRadius: '8px', backgroundColor: 'transparent', color: textColor, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px 20px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>
          <FolderIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: borderColor }} />
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{
                padding: '24px',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>
                  {project.key}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>{project.name}</h3>
                </div>
              </div>
              {project.description && (
                <p style={{ fontSize: '14px', color: secondaryText, marginBottom: '16px', lineHeight: '1.6' }}>
                  {project.description}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '16px', borderTop: `1px solid ${borderColor}`, fontSize: '13px', color: secondaryText }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserGroupIcon style={{ width: '16px', height: '16px' }} />
                  <span>{project.lead_name || 'No lead'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
