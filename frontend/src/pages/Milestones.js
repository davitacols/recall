import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function Milestones() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [goal, setGoal] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadGoal();
    loadMilestones();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const res = await api.get(`/api/business/goals/${goalId}/`);
      setGoal(res.data);
    } catch (error) {
      addToast('Failed to load goal', 'error');
    }
  };

  const loadMilestones = async () => {
    try {
      const res = await api.get(`/api/business/goals/${goalId}/milestones/`);
      setMilestones(res.data);
    } catch (error) {
      addToast('Failed to load milestones', 'error');
    }
  };

  const createMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/business/goals/${goalId}/milestones/`, formData);
      setShowModal(false);
      setFormData({ title: '', description: '', due_date: '' });
      loadMilestones();
      addToast('Milestone created', 'success');
    } catch (error) {
      addToast('Failed to create milestone', 'error');
    }
  };

  const toggleComplete = async (milestone) => {
    try {
      await api.put(`/api/business/goals/${goalId}/milestones/${milestone.id}/`, {
        ...milestone,
        completed: !milestone.completed
      });
      loadMilestones();
      addToast(milestone.completed ? 'Milestone reopened' : 'Milestone completed', 'success');
    } catch (error) {
      addToast('Failed to update milestone', 'error');
    }
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/business/goals')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', color: '#3b82f6', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none' }}
      >
        <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
        Back to Goals
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>
            {goal?.title} - Milestones
          </h1>
          <p style={{ fontSize: '14px', color: secondaryText }}>
            {completedCount} of {milestones.length} completed ({Math.round(progress)}%)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}
        >
          <PlusIcon style={{ width: '16px', height: '16px' }} />
          Add Milestone
        </button>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ height: '8px', backgroundColor: darkMode ? '#292524' : '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#10b981', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {milestones.map(milestone => (
          <div
            key={milestone.id}
            style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px', opacity: milestone.completed ? 0.6 : 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <button
                onClick={() => toggleComplete(milestone)}
                style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${milestone.completed ? '#10b981' : borderColor}`, backgroundColor: milestone.completed ? '#10b981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                {milestone.completed && <CheckCircleIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />}
              </button>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '4px', textDecoration: milestone.completed ? 'line-through' : 'none' }}>
                  {milestone.title}
                </h3>
                {milestone.description && (
                  <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '8px' }}>{milestone.description}</p>
                )}
                {milestone.due_date && (
                  <p style={{ fontSize: '12px', color: secondaryText }}>
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: bgColor, borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '20px' }}>Add Milestone</h2>
            <form onSubmit={createMilestone}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none' }}
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
