import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';
import BrandedTechnicalIllustration from '../components/BrandedTechnicalIllustration';
import { getProjectPalette, getProjectUi } from '../utils/projectUi';

export default function Milestones() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [goal, setGoal] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

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
    <div style={{ ...ui.container, display: 'grid', gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <button
        onClick={() => navigate('/business/goals')}
        style={{ ...ui.secondaryButton, width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6, color: palette.muted }}
      >
        <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
        Back to Goals
      </button>

      <section style={{ border: `1px solid ${palette.border}`, borderRadius: 16, padding: 'clamp(16px,2.2vw,24px)', background: `linear-gradient(138deg, ${palette.accentSoft}, ${darkMode ? 'rgba(31,143,102,0.12)' : 'rgba(187,247,208,0.45)'})`, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'end' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', fontWeight: 700, color: palette.muted }}>GOAL DELIVERY</p>
          <h1 style={{ marginTop: 4, marginBottom: 6, fontSize: 'clamp(1.1rem,2vw,1.56rem)', fontWeight: 700, color: palette.text }}>
            {goal?.title} - Milestones
          </h1>
          <p style={{ fontSize: '13px', color: palette.muted, margin: 0 }}>
            {completedCount} of {milestones.length} completed ({Math.round(progress)}%)
          </p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowModal(true)} style={ui.primaryButton}>
          <PlusIcon style={{ width: '16px', height: '16px' }} />
          Add Milestone
        </button>
      </div>

      <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: '12px', padding: '14px' }}>
        <div style={{ height: '8px', backgroundColor: palette.progressTrack, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: palette.success, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {milestones.map(milestone => (
          <div
            key={milestone.id}
            style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: '12px', padding: '14px', opacity: milestone.completed ? 0.6 : 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <button
                onClick={() => toggleComplete(milestone)}
                style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${milestone.completed ? palette.success : palette.border}`, backgroundColor: milestone.completed ? palette.success : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                {milestone.completed && <CheckCircleIcon style={{ width: '16px', height: '16px', color: '#ffffff' }} />}
              </button>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: palette.text, marginBottom: '4px', textDecoration: milestone.completed ? 'line-through' : 'none' }}>
                  {milestone.title}
                </h3>
                {milestone.description && (
                  <p style={{ fontSize: '13px', color: palette.muted, marginBottom: '8px' }}>{milestone.description}</p>
                )}
                {milestone.due_date && (
                  <p style={{ fontSize: '12px', color: palette.muted }}>
                    Due: {new Date(milestone.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--app-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: '14px', padding: '22px', width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: palette.text, marginBottom: '20px' }}>Add Milestone</h2>
            <form onSubmit={createMilestone}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: palette.text, marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ ...ui.input, padding: '8px 12px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: palette.text, marginBottom: '6px' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ ...ui.input, padding: '8px 12px', fontSize: '13px', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: palette.text, marginBottom: '6px' }}>Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  style={{ ...ui.input, padding: '8px 12px', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ ...ui.secondaryButton, padding: '8px 16px', color: palette.text, fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...ui.primaryButton, padding: '8px 16px', fontSize: '13px' }}
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
