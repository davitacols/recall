import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, shadows, radius, motion } from '../utils/designTokens';
import { PlusIcon } from '@heroicons/react/24/outline';

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
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
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
      console.error('Failed to create project:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
            Projects
          </h1>
          <p style={{ fontSize: '16px', color: colors.secondary }}>
            Manage your projects and boards
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setError('');
          }}
          style={{
            padding: `${spacing.md} ${spacing.lg}`,
            backgroundColor: colors.primary,
            color: colors.surface,
            border: 'none',
            borderRadius: radius.md,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            fontWeight: 500,
            transition: motion.fast,
            boxShadow: shadows.sm
          }}
        >
          <PlusIcon style={{ width: '18px', height: '18px' }} />
          New Project
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.xl,
            maxWidth: '500px',
            width: '90%',
            boxShadow: shadows.lg
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
              Create New Project
            </h2>

            {error && (
              <div style={{
                padding: spacing.md,
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: radius.md,
                color: '#DC2626',
                fontSize: '14px',
                marginBottom: spacing.lg
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mobile App"
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.md}`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  disabled={submitting}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
                  Project Key *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  placeholder="e.g., MOBILE"
                  maxLength="10"
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.md}`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  disabled={submitting}
                />
                <p style={{ fontSize: '12px', color: colors.secondary, marginTop: '4px' }}>
                  Used for issue IDs (e.g., MOBILE-1, MOBILE-2)
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.primary, marginBottom: spacing.sm }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description..."
                  rows="4"
                  style={{
                    width: '100%',
                    padding: `${spacing.md} ${spacing.md}`,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  disabled={submitting}
                />
              </div>
              <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError('');
                  }}
                  disabled={submitting}
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    backgroundColor: colors.background,
                    color: colors.primary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    transition: motion.fast,
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    backgroundColor: colors.primary,
                    color: colors.surface,
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    transition: motion.fast,
                    opacity: submitting ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm
                  }}
                >
                  {submitting && (
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                  )}
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: `${spacing.xl} ${spacing.lg}`,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          backgroundColor: colors.background
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
            No projects yet
          </h3>
          <p style={{ fontSize: '14px', color: colors.secondary, marginBottom: spacing.lg }}>
            Create your first project to get started with Kanban boards
          </p>
          <button
            onClick={() => {
              setShowCreateForm(true);
              setError('');
            }}
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              backgroundColor: colors.primary,
              color: colors.surface,
              border: 'none',
              borderRadius: radius.md,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: spacing.lg
        }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  padding: spacing.lg,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  cursor: 'pointer',
                  transition: motion.fast,
                  boxShadow: shadows.sm
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.surface,
                      fontWeight: 700,
                      fontSize: '16px'
                    }}
                  >
                    {project.key.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.primary }}>
                      {project.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: colors.secondary }}>
                      {project.key}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: colors.secondary, marginBottom: spacing.md, lineHeight: 1.5 }}>
                  {project.description || 'No description'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: colors.secondary }}>
                  <span>{project.issue_count} issues</span>
                  <span>Lead: {project.lead || 'Unassigned'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
