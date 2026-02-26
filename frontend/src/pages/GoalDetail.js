import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { ArrowLeftIcon, TrashIcon, FlagIcon } from '@heroicons/react/24/outline';


export default function GoalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const cardBg = darkMode ? '#292524' : '#f9fafb';
  const textColor = darkMode ? '#fafaf9' : '#1f2937';
  const borderColor = darkMode ? '#44403c' : '#e5e7eb';

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/goals/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGoal(data);
      setFormData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/goals/${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setEditing(false);
      fetchGoal();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/business/goals/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/business/goals');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: textColor }}>Loading...</div>;
  if (!goal) return <div style={{ padding: '2rem', color: textColor }}>Goal not found</div>;

  return (
    <div style={{ padding: '2rem', backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/business/goals')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: `1px solid ${borderColor}`,
            color: textColor,
            borderRadius: '0.5rem',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
          Back
        </button>

        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '0.75rem', padding: '2rem' }}>
          {editing ? (
            <form onSubmit={handleUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    backgroundColor: bgColor,
                    color: textColor
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    backgroundColor: bgColor,
                    color: textColor
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    backgroundColor: bgColor,
                    color: textColor
                  }}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    backgroundColor: bgColor,
                    color: textColor
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    border: `2px solid ${borderColor}`,
                    color: textColor,
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    border: '2px solid #3b82f6',
                    color: '#3b82f6',
                    borderRadius: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{goal.title}</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => navigate(`/business/goals/${id}/milestones`)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      border: `2px solid #10b981`,
                      color: '#10b981',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FlagIcon style={{ width: '1rem', height: '1rem' }} />
                    Milestones
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      border: `2px solid #3b82f6`,
                      color: '#3b82f6',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      border: `2px solid #ef4444`,
                      color: '#ef4444',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
              </div>
              <p style={{ color: darkMode ? '#a8a29e' : '#6b7280', marginBottom: '1.5rem' }}>{goal.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Status</span>
                  <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{goal.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Progress</span>
                  <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{goal.progress}%</p>
                </div>
                {goal.target_date && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Target Date</span>
                    <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{new Date(goal.target_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {goal.tasks && goal.tasks.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Related Tasks</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {goal.tasks.map(task => (
                      <div key={task.id} style={{ padding: '0.75rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '0.5rem' }}>
                        <span>{task.title}</span>
                        <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>({task.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


