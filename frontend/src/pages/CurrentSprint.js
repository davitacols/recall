import React, { useState, useEffect } from 'react';
import api from '../services/api';

function CurrentSprint() {
  const [sprint, setSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [isReportingBlocker, setIsReportingBlocker] = useState(false);

  useEffect(() => {
    fetchSprint();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchSprint();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSprint = async () => {
    try {
      const sprintRes = await api.get('/api/agile/current-sprint/');
      setSprint(sprintRes.data);
      
      if (sprintRes.data.id) {
        const blockersRes = await api.get(`/api/agile/blockers/?sprint_id=${sprintRes.data.id}`).catch(() => ({ data: [] }));
        setBlockers(blockersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch sprint:', error);
      setSprint(null);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = '#1c1917';
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const hoverBg = '#292524';
  const secondaryText = '#a8a29e';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #292524', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>No active sprint</h2>
        <p style={{ fontSize: '14px', color: secondaryText, marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>Create a sprint in a project to start tracking progress, blockers, and team updates.</p>
        <a href="/projects" style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Go to Projects →</a>
      </div>
    );
  }

  const completionPercentage = sprint.completed && sprint.issue_count ? Math.round((sprint.completed / sprint.issue_count) * 100) : 0;

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Sprint Header */}
      <div style={{ padding: '20px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '6px', letterSpacing: '-0.01em' }}>{sprint.name}</h1>
            <p style={{ fontSize: '13px', color: secondaryText }}>{sprint.start_date} to {sprint.end_date}</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ padding: '4px 10px', backgroundColor: '#065f46', color: '#6ee7b7', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRadius: '3px' }}>Active</span>
          </div>
        </div>

        {sprint.goal && (
          <p style={{ color: secondaryText, fontSize: '13px', fontStyle: 'italic' }}>Goal: {sprint.goal}</p>
        )}
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left: Issues Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Sprint Progress</h2>

          {/* Progress Bar */}
          <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: secondaryText, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Completion</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>{completionPercentage}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: borderColor, borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{ width: `${completionPercentage}%`, height: '100%', backgroundColor: '#10b981', transition: 'all 0.3s' }}
              />
            </div>
          </div>

          {/* Issue Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{sprint.completed || 0}</p>
              <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Completed</p>
            </div>

            <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>{sprint.in_progress || 0}</p>
              <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>In Progress</p>
            </div>

            <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 600, color: secondaryText, marginBottom: '4px' }}>{sprint.todo || 0}</p>
              <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>To Do</p>
            </div>
          </div>

          {/* View Board Link */}
          {sprint.project_id && (
            <a href={`/projects/${sprint.project_id}`} style={{ display: 'inline-block', padding: '10px 16px', backgroundColor: '#3b82f6', color: '#ffffff', textDecoration: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', textAlign: 'center', transition: 'all 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
              View Kanban Board →
            </a>
          )}
        </div>

        {/* Right: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Blockers */}
          <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Active Blockers</h3>

            {blockers.length === 0 ? (
              <p style={{ fontSize: '12px', color: secondaryText, fontWeight: 500, marginBottom: '12px' }}>No active blockers</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {blockers.slice(0, 3).map(blocker => (
                  <div key={blocker.id} style={{ padding: '10px', backgroundColor: bgColor, borderLeft: `3px solid #ef4444`, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{blocker.title}</div>
                    <div style={{ fontSize: '11px', color: secondaryText }}>{blocker.days_open} days open</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowBlockerModal(true)}
              disabled={isReportingBlocker}
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', opacity: isReportingBlocker ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onMouseEnter={(e) => !isReportingBlocker && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !isReportingBlocker && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {isReportingBlocker && (
                <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              )}
              Report Blocker
            </button>
          </div>

          {/* Sprint Info */}
          <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '12px' }}>Sprint Info</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', color: secondaryText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>Total Issues</p>
                <p style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{sprint.issue_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBlockerModal && (
        <BlockerModal
          sprintId={sprint.id}
          onClose={() => setShowBlockerModal(false)}
          onSubmit={() => {
            setShowBlockerModal(false);
            fetchSprint();
          }}
        />
      )}
    </div>
  );
}

function BlockerModal({ sprintId, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('technical');
  const [submitting, setSubmitting] = useState(false);

  const bgColor = '#1c1917';
  const textColor = '#e7e5e4';
  const borderColor = '#292524';
  const secondaryText = '#a8a29e';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/agile/blockers/', {
        sprint_id: sprintId,
        title,
        description,
        type
      });
      onSubmit();
    } catch (error) {
      console.error('Failed to create blocker:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
      <div style={{ backgroundColor: bgColor, padding: '24px', width: '100%', maxWidth: '500px', borderRadius: '5px', border: `1px solid ${borderColor}` }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: textColor, marginBottom: '20px' }}>Report Blocker</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textColor, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's blocking progress?"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: '#0c0a09', color: textColor, fontSize: '13px', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textColor, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: '#0c0a09', color: textColor, fontSize: '13px', outline: 'none' }}
            >
              <option value="technical">Technical</option>
              <option value="dependency">Dependency</option>
              <option value="decision">Decision Needed</option>
              <option value="resource">Resource</option>
              <option value="external">External</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textColor, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context..."
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: '#0c0a09', color: textColor, fontSize: '13px', outline: 'none', minHeight: '80px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '10px 14px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor, color: textColor, fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', opacity: submitting ? 0.5 : 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '10px 14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting && (
                <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              )}
              {submitting ? 'Creating...' : 'Report Blocker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CurrentSprint;
