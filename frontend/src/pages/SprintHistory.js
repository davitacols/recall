import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, shadows, radius } from '../utils/designTokens';

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
      setSprints(sprintsRes.data);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #E5E7EB', borderTop: '2px solid #0F172A', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: colors.primary, marginBottom: spacing.sm }}>
          Sprint History
        </h1>
        <p style={{ fontSize: '14px', color: colors.secondary }}>
          Institutional memory for your team
        </p>
      </div>

      {/* Filter */}
      {projects.length > 0 && (
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          marginBottom: spacing.xl
        }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
            Filter by Project
          </label>
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: spacing.md,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
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
        <div style={{
          textAlign: 'center',
          padding: spacing.xl,
          backgroundColor: colors.background,
          borderRadius: radius.md,
          border: `1px solid ${colors.border}`
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.md }}>
            No past sprints
          </h3>
          <p style={{ fontSize: '14px', color: colors.secondary }}>
            Sprint history will appear here once sprints are completed
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {filteredSprints.map(sprint => (
            <div key={sprint.id} style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              padding: spacing.lg,
              boxShadow: shadows.sm
            }}>
              {/* Sprint Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: spacing.lg }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: colors.primary, marginBottom: spacing.sm }}>
                    {sprint.name}
                  </h2>
                  <p style={{ fontSize: '12px', color: colors.secondary }}>
                    {sprint.project_name} • {sprint.start_date} to {sprint.end_date}
                  </p>
                </div>
                <Link
                  to={`/sprints/${sprint.id}`}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.primary,
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: radius.md,
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  View Details
                </Link>
              </div>

              {/* Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: spacing.md,
                marginBottom: spacing.lg
              }}>
                <div style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>
                    {sprint.completed}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase' }}>
                    Completed
                  </div>
                </div>

                <div style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444', marginBottom: '4px' }}>
                    {sprint.blocked}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase' }}>
                    Blocked
                  </div>
                </div>

                <div style={{
                  backgroundColor: colors.background,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary, marginBottom: '4px' }}>
                    {sprint.decisions}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.secondary, textTransform: 'uppercase' }}>
                    Decisions
                  </div>
                </div>
              </div>

              {/* Completion Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary }}>
                    Completion
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary }}>
                    {sprint.completed}/{sprint.completed + sprint.blocked}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: colors.background,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${sprint.completed + sprint.blocked > 0 ? (sprint.completed / (sprint.completed + sprint.blocked)) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: '#10B981',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Projects Link */}
      <div style={{ marginTop: spacing.xl }}>
        <Link to="/projects" style={{
          display: 'inline-block',
          padding: `${spacing.md} ${spacing.lg}`,
          backgroundColor: colors.primary,
          color: 'white',
          textDecoration: 'none',
          borderRadius: radius.md,
          fontSize: '14px',
          fontWeight: 500
        }}>
          View All Projects →
        </Link>
      </div>
    </div>
  );
}

export default SprintHistory;
