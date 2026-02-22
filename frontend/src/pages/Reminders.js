import React, { useState, useEffect } from 'react';
import { PlusIcon, BellIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { useToast } from '../components/Toast';

export default function Reminders() {
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [reminders, setReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', remind_at: '' });

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await api.get('/api/business/reminders/');
      setReminders(res.data);
    } catch (error) {
      addToast('Failed to load reminders', 'error');
    }
  };

  const createReminder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/business/reminders/', formData);
      setShowModal(false);
      setFormData({ title: '', message: '', remind_at: '' });
      loadReminders();
      addToast('Reminder created', 'success');
    } catch (error) {
      addToast('Failed to create reminder', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>Reminders</h1>
          <p style={{ fontSize: '14px', color: secondaryText }}>Upcoming reminders for goals, meetings, and tasks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: '2px solid #3b82f6', color: '#3b82f6', borderRadius: '5px', fontWeight: 500, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}
        >
          <PlusIcon style={{ width: '16px', height: '16px' }} />
          New Reminder
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reminders.map(reminder => (
          <div
            key={reminder.id}
            style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BellIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>{reminder.title}</h3>
                <p style={{ fontSize: '13px', color: secondaryText, marginBottom: '8px' }}>{reminder.message}</p>
                <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>
                  {new Date(reminder.remind_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reminders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: secondaryText }}>
          <BellIcon style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
          <p>No upcoming reminders</p>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowModal(false)}>
          <div style={{ backgroundColor: bgColor, borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: textColor, marginBottom: '20px' }}>New Reminder</h2>
            <form onSubmit={createReminder}>
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', color: textColor, fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: textColor, marginBottom: '6px' }}>Remind At</label>
                <input
                  type="datetime-local"
                  value={formData.remind_at}
                  onChange={(e) => setFormData({ ...formData, remind_at: e.target.value })}
                  required
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
