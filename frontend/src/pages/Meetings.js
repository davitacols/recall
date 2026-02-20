import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function Meetings() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', meeting_date: '', duration_minutes: 60, location: '', goal_id: '', conversation_id: '', decision_id: '' });

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-stone-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-stone-700' : 'hover:bg-gray-100';
  const hoverBorder = darkMode ? 'hover:border-stone-700' : 'hover:border-gray-300';
  const inputBg = darkMode ? 'bg-stone-800' : 'bg-white';
  const inputBorder = darkMode ? 'border-stone-700' : 'border-gray-300';
  const inputText = darkMode ? 'text-stone-200' : 'text-gray-900';

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/business/meetings/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('API Error:', res.status, await res.text());
        setMeetings([]);
        return;
      }
      const data = await res.json();
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/business/meetings/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ title: '', description: '', meeting_date: '', duration_minutes: 60, location: '', goal_id: '', conversation_id: '', decision_id: '' });
      fetchMeetings();
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className={`p-5 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-4 ${inputBg} rounded w-1/2 mb-3`}></div>
                <div className={`h-3 ${inputBg} rounded w-full mb-2`}></div>
                <div className={`h-3 ${inputBg} rounded w-3/4`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Meetings</h1>
            <p className={`text-sm ${textSecondary}`}>Schedule and track your meetings</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Meeting
          </button>
        </div>

        <div className="space-y-3">
          {meetings.map(meeting => (
            <div
              key={meeting.id}
              onClick={() => navigate(`/business/meetings/${meeting.id}`)}
              className={`p-5 ${bgSecondary} border ${borderColor} rounded-lg ${hoverBorder} hover:bg-opacity-80 transition-all cursor-pointer`}
            >
              <div className="flex gap-4">
                <CalendarIcon className={`w-5 h-5 ${textSecondary} flex-shrink-0 mt-1`} />
                <div className="flex-1">
                  <h3 className={`text-base font-semibold ${textPrimary} mb-1`}>{meeting.title}</h3>
                  <p className={`text-sm ${textTertiary} mb-3`}>{meeting.description}</p>
                  <div className={`flex gap-6 text-xs ${textSecondary}`}>
                    <span>{new Date(meeting.meeting_date).toLocaleString()}</span>
                    <span>{meeting.duration_minutes} min</span>
                    {meeting.location && <span>{meeting.location}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-5`}>Schedule Meeting</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 bg-transparent ${textTertiary} border-2 ${borderColor} rounded ${hoverBg} font-medium text-sm`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-transparent border-2 ${inputBorder} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm`}
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
