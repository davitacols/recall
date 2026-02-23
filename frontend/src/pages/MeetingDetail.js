import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import AIAssistant from '../components/AIAssistant';
import ContextPanel from '../components/ContextPanel';

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const cardBg = darkMode ? '#292524' : '#f9fafb';
  const textColor = darkMode ? '#fafaf9' : '#1f2937';
  const borderColor = darkMode ? '#44403c' : '#e5e7eb';

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/business/meetings/${id}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMeeting(data);
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
      await fetch(`http://localhost:8000/api/business/meetings/${id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setEditing(false);
      fetchMeeting();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this meeting?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:8000/api/business/meetings/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/business/meetings');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: textColor }}>Loading...</div>;
  if (!meeting) return <div style={{ padding: '2rem', color: textColor }}>Meeting not found</div>;

  return (
    <div style={{ padding: '2rem', backgroundColor: bgColor, minHeight: '100vh', color: textColor }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/business/meetings')}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
          <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '0.75rem', padding: '2rem' }}>
          <AIAssistant content={meeting?.notes} contentType="meeting" />
          
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
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
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{meeting.title}</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Date & Time</span>
                  <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{new Date(meeting.meeting_date).toLocaleString()}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Duration</span>
                  <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{meeting.duration_minutes} minutes</p>
                </div>
                {meeting.location && (
                  <div>
                    <span style={{ fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>Location</span>
                    <p style={{ fontWeight: '600', marginTop: '0.25rem' }}>{meeting.location}</p>
                  </div>
                )}
              </div>
              {meeting.attendees && meeting.attendees.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Attendees</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {meeting.attendees.map(attendee => (
                      <span key={attendee.id} style={{ padding: '0.5rem 1rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '9999px', fontSize: '0.875rem' }}>
                        {attendee.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {meeting.notes && (
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Notes</h2>
                  <p style={{ color: darkMode ? '#a8a29e' : '#6b7280', whiteSpace: 'pre-wrap' }}>{meeting.notes}</p>
                </div>
              )}
              {meeting.action_items && meeting.action_items.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Action Items</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {meeting.action_items.map(item => (
                      <div key={item.id} style={{ padding: '0.75rem', backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '0.5rem' }}>
                        <span>{item.title}</span>
                        {item.assigned_to && <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: darkMode ? '#a8a29e' : '#6b7280' }}>- {item.assigned_to.full_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div>
          <ContextPanel contentType="business.meeting" objectId={id} />
        </div>
      </div>
      </div>
    </div>
  );
}
