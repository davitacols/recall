import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { PlusIcon, FlagIcon } from '@heroicons/react/24/outline';

export default function Goals() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', target_date: '', status: 'not_started', conversation_id: '', decision_id: '' });

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
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/business/goals/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('API Error:', res.status, await res.text());
        setGoals([]);
        return;
      }
      const data = await res.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/business/goals/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ title: '', description: '', target_date: '', status: 'not_started', conversation_id: '', decision_id: '' });
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const statusColors = {
    not_started: darkMode ? 'text-stone-500 bg-stone-500/20' : 'text-gray-500 bg-gray-500/20',
    in_progress: darkMode ? 'text-blue-400 bg-blue-400/20' : 'text-blue-600 bg-blue-600/20',
    completed: darkMode ? 'text-green-400 bg-green-400/20' : 'text-green-600 bg-green-600/20',
    on_hold: darkMode ? 'text-yellow-400 bg-yellow-400/20' : 'text-yellow-600 bg-yellow-600/20'
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg animate-pulse`}>
                <div className={`h-4 ${inputBg} rounded w-3/4 mb-3`}></div>
                <div className={`h-3 ${inputBg} rounded w-full mb-2`}></div>
                <div className={`h-3 ${inputBg} rounded w-2/3`}></div>
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
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Goals</h1>
            <p className={`text-sm ${textSecondary}`}>Track and manage your business goals</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border-2 ${borderColor} ${textPrimary} rounded ${hoverBg} ${hoverBorder} font-medium text-sm transition-all`}
          >
            <PlusIcon className="w-4 h-4" />
            New Goal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <div
              key={goal.id}
              onClick={() => navigate(`/business/goals/${goal.id}`)}
              className={`p-6 ${bgSecondary} border ${borderColor} rounded-lg ${hoverBorder} hover:bg-opacity-80 transition-all cursor-pointer`}
            >
              <div className="flex items-start gap-3 mb-4">
                <FlagIcon className={`w-5 h-5 ${statusColors[goal.status].split(' ')[0]}`} />
                <div className="flex-1">
                  <h3 className={`text-base font-semibold ${textPrimary} mb-1`}>{goal.title}</h3>
                  <p className={`text-sm ${textTertiary} line-clamp-2`}>{goal.description}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t ${borderColor}">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[goal.status]}`}>
                  {goal.status.replace('_', ' ')}
                </span>
                <span className={`text-sm ${textSecondary}`}>{goal.progress}%</span>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textPrimary} mb-5`}>Create New Goal</h2>
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
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 ${inputBg} ${inputText} border ${inputBorder} rounded focus:outline-none focus:border-stone-600`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textTertiary} mb-2`}>Target Date</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
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
                    Create Goal
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
