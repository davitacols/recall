import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, CalendarIcon, ChartBarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function SprintManagement() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [sprints, setSprints] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [loading, setLoading] = useState(true);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const cardBg = darkMode ? '#0c0a09' : '#ffffff';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    fetchSprints();
    fetchBlockers();
  }, []);

  const fetchSprints = async () => {
    try {
      const res = await api.get('/api/agile/sprints/');
      setSprints(res.data);
      const active = res.data.find(s => s.status === 'active');
      setCurrentSprint(active);
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockers = async () => {
    try {
      const res = await api.get('/api/agile/blockers/');
      setBlockers(res.data.filter(b => b.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch blockers:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/agile/sprints/', newSprint);
      setShowCreate(false);
      setNewSprint({ name: '', start_date: '', end_date: '', goal: '' });
      fetchSprints();
    } catch (error) {
      console.error('Failed to create sprint:', error);
    }
  };

  const statusConfig = {
    planning: { bg: darkMode ? '#312e81' : '#e0e7ff', text: darkMode ? '#a5b4fc' : '#3730a3' },
    active: { bg: darkMode ? '#065f46' : '#d1fae5', text: darkMode ? '#6ee7b7' : '#065f46' },
    completed: { bg: darkMode ? '#374151' : '#f3f4f6', text: darkMode ? '#9ca3af' : '#4b5563' }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: secondaryText }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>Sprint Management</h1>
          <p style={{ fontSize: '15px', color: secondaryText }}>Plan and track your team's sprints</p>
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
          New Sprint
        </button>
      </div>

      {/* Current Sprint */}
      {currentSprint && (
        <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: cardBg, border: `2px solid #3b82f6`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, color: textColor }}>{currentSprint.name}</h2>
                <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', backgroundColor: statusConfig.active.bg, color: statusConfig.active.text }}>
                  Active
                </span>
              </div>
              <p style={{ fontSize: '14px', color: secondaryText }}>{currentSprint.goal}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: secondaryText, marginBottom: '4px' }}>
                {new Date(currentSprint.start_date).toLocaleDateString()} - {new Date(currentSprint.end_date).toLocaleDateString()}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: textColor }}>
                {Math.ceil((new Date(currentSprint.end_date) - new Date()) / (1000 * 60 * 60 * 24))} days left
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
            <div style={{ padding: '16px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{currentSprint.completed_count || 0}</div>
              <div style={{ fontSize: '13px', color: secondaryText }}>Completed</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{currentSprint.blocked_count || 0}</div>
              <div style={{ fontSize: '13px', color: secondaryText }}>Blocked</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: darkMode ? '#292524' : '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{currentSprint.decisions_made || 0}</div>
              <div style={{ fontSize: '13px', color: secondaryText }}>Decisions</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Blockers */}
      {blockers.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationTriangleIcon style={{ width: '24px', height: '24px', color: '#ef4444' }} />
            Active Blockers ({blockers.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blockers.map((blocker) => (
              <div key={blocker.id} style={{ padding: '16px', backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{blocker.title}</h3>
                <p style={{ fontSize: '14px', color: secondaryText }}>{blocker.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Sprints */}
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '16px' }}>All Sprints</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sprints.map((sprint) => {
          const status = statusConfig[sprint.status] || statusConfig.planning;
          return (
            <div
              key={sprint.id}
              onClick={() => navigate(`/sprints/${sprint.id}`)}
              style={{
                padding: '20px',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: textColor }}>{sprint.name}</h3>
                    <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', backgroundColor: status.bg, color: status.text, textTransform: 'capitalize' }}>
                      {sprint.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: secondaryText }}>{sprint.goal}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: secondaryText }}>
                  <CalendarIcon style={{ width: '16px', height: '16px', display: 'inline', marginRight: '4px' }} />
                  {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: bgColor, borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Create Sprint</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Sprint Name</label>
                <input
                  type="text"
                  required
                  value={newSprint.name}
                  onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                  placeholder="Sprint 1"
                  style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={newSprint.start_date}
                    onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={newSprint.end_date}
                    onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: `2px solid ${borderColor}`, borderRadius: '8px', backgroundColor: bgColor, color: textColor, fontSize: '15px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textColor, marginBottom: '8px' }}>Sprint Goal</label>
                <textarea
                  value={newSprint.goal}
                  onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                  rows={3}
                  placeholder="What do you want to achieve?"
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
    </div>
  );
}
