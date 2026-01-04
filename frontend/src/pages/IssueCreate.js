import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows, motion } from '../utils/designTokens';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function IssueCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get('boardId');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee_id: null,
    sprint_id: null,
    story_points: '',
    due_date: ''
  });
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSprints(selectedProject);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/agile/projects/');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0].id);
      } else {
        setError('No projects available. Please create a project first.');
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchSprints = async (projectId) => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/sprints/`);
      setSprints(response.data);
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get('/api/auth/team/');
      setTeamMembers(response.data);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!selectedProject) {
      setError('Project is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        project_id: selectedProject,
        assignee_id: formData.assignee_id,
        sprint_id: formData.sprint_id,
        status: 'todo'
      };

      if (formData.story_points) {
        payload.story_points = parseInt(formData.story_points);
      }

      if (formData.due_date) {
        payload.due_date = formData.due_date;
      }

      const response = await api.post(`/api/agile/projects/${selectedProject}/issues/`, payload);
      navigate(`/boards/${boardId || 1}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create issue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: colors.secondary,
          fontSize: '14px',
          marginBottom: spacing.lg,
          transition: motion.fast
        }}
        onMouseEnter={(e) => e.target.style.color = colors.primary}
        onMouseLeave={(e) => e.target.style.color = colors.secondary}
      >
        <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
        Back
      </button>

      <div style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        padding: spacing.xl,
        boxShadow: shadows.sm
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.primary, marginBottom: spacing.lg }}>
          Create New Issue
        </h1>

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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Project *
            </label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                color: colors.primary,
                backgroundColor: colors.background,
                cursor: 'pointer'
              }}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Issue title"
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                color: colors.primary,
                backgroundColor: colors.background,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Issue description"
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                color: colors.primary,
                backgroundColor: colors.background,
                fontFamily: 'inherit',
                minHeight: '120px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  color: colors.primary,
                  backgroundColor: colors.background,
                  cursor: 'pointer'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                Story Points
              </label>
              <input
                type="number"
                name="story_points"
                value={formData.story_points}
                onChange={handleChange}
                placeholder="0"
                min="0"
                style={{
                  width: '100%',
                  padding: spacing.md,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  color: colors.primary,
                  backgroundColor: colors.background,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                Assignee
              </label>
              <select
                name="assignee_id"
                value={formData.assignee_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee_id: e.target.value ? parseInt(e.target.value) : null }))}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  color: colors.primary,
                  backgroundColor: colors.background,
                  cursor: 'pointer'
                }}
              >
                <option value="">Unassigned</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
                Sprint
              </label>
              <select
                name="sprint_id"
                value={formData.sprint_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sprint_id: e.target.value ? parseInt(e.target.value) : null }))}
                style={{
                  width: '100%',
                  padding: spacing.md,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: '14px',
                  color: colors.primary,
                  backgroundColor: colors.background,
                  cursor: 'pointer'
                }}
              >
                <option value="">No Sprint</option>
                {sprints.map(sprint => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, display: 'block', marginBottom: spacing.sm }}>
              Due Date
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: spacing.md,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                color: colors.primary,
                backgroundColor: colors.background,
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: spacing.md,
                backgroundColor: colors.primary,
                color: colors.surface,
                border: 'none',
                borderRadius: radius.md,
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: motion.fast,
                boxShadow: shadows.sm
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#1a1f35')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = colors.primary)}
            >
              {loading ? 'Creating...' : 'Create Issue'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                flex: 1,
                padding: spacing.md,
                backgroundColor: colors.background,
                color: colors.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: motion.fast
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = colors.border}
              onMouseLeave={(e) => e.target.style.backgroundColor = colors.background}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IssueCreate;
