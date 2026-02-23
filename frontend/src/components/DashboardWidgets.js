import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { 
  ClipboardDocumentCheckIcon, 
  DocumentCheckIcon, 
  CalendarIcon,
  PlusIcon,
  ChatBubbleLeftIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

export default function DashboardWidgets() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50';

  useEffect(() => {
    fetchDigest();
  }, []);

  const fetchDigest = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/daily-digest/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDigest(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'New Task', icon: ClipboardDocumentCheckIcon, path: '/business/tasks', color: 'blue' },
    { label: 'New Conversation', icon: ChatBubbleLeftIcon, path: '/conversations/new', color: 'green' },
    { label: 'New Decision', icon: DocumentCheckIcon, path: '/decisions', color: 'purple' },
    { label: 'New Goal', icon: FlagIcon, path: '/business/goals', color: 'orange' }
  ];

  const getColorClass = (color) => {
    if (darkMode) {
      return color === 'blue' ? 'bg-blue-900/20 text-blue-400 border-blue-800' :
             color === 'green' ? 'bg-green-900/20 text-green-400 border-green-800' :
             color === 'purple' ? 'bg-purple-900/20 text-purple-400 border-purple-800' :
             'bg-orange-900/20 text-orange-400 border-orange-800';
    }
    return color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
           color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
           color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
           'bg-orange-50 text-orange-700 border-orange-200';
  };

  const getPriorityColor = (priority) => {
    if (darkMode) {
      return priority === 'high' ? 'text-red-400' :
             priority === 'medium' ? 'text-yellow-400' : 'text-blue-400';
    }
    return priority === 'high' ? 'text-red-600' :
           priority === 'medium' ? 'text-yellow-600' : 'text-blue-600';
  };

  if (loading) {
    return <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
        <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`p-3 border rounded-lg ${getColorClass(action.color)} ${hoverBg} transition-all text-left`}
              >
                <Icon className="w-5 h-5 mb-2" />
                <div className="text-xs font-medium">{action.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending Tasks */}
      {digest?.pending_tasks && digest.pending_tasks.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Pending Tasks</h3>
          <div className="space-y-2">
            {digest.pending_tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate('/business/tasks')}
                className={`p-3 border ${borderColor} rounded cursor-pointer ${hoverBg} transition-all`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className={`text-sm font-medium ${textPrimary}`}>{task.title}</div>
                  <span className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                {task.due_date && (
                  <div className={`text-xs ${textSecondary}`}>
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisions Needing Input */}
      {digest?.decisions_needing_input && digest.decisions_needing_input.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Decisions Needing Input</h3>
          <div className="space-y-2">
            {digest.decisions_needing_input.map((decision) => (
              <div
                key={decision.id}
                onClick={() => navigate(`/decisions/${decision.id}`)}
                className={`p-3 border ${borderColor} rounded cursor-pointer ${hoverBg} transition-all`}
              >
                <div className={`text-sm font-medium ${textPrimary} mb-1`}>{decision.title}</div>
                <div className={`text-xs ${textSecondary} capitalize`}>
                  {decision.impact_level} impact • {decision.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      {digest?.upcoming_meetings && digest.upcoming_meetings.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <h3 className={`text-sm font-semibold ${textPrimary} mb-3 flex items-center gap-2`}>
            <CalendarIcon className="w-4 h-4" />
            Today's Meetings
          </h3>
          <div className="space-y-2">
            {digest.upcoming_meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => navigate(`/business/meetings/${meeting.id}`)}
                className={`p-3 border ${borderColor} rounded cursor-pointer ${hoverBg} transition-all`}
              >
                <div className={`text-sm font-medium ${textPrimary} mb-1`}>{meeting.title}</div>
                <div className={`text-xs ${textSecondary}`}>
                  {new Date(meeting.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {meeting.duration_minutes} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Summary */}
      {digest?.activity_summary && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Last 24 Hours</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{digest.activity_summary.decisions}</div>
              <div className={`text-xs ${textSecondary}`}>Decisions</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>{digest.activity_summary.conversations}</div>
              <div className={`text-xs ${textSecondary}`}>Conversations</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
