import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLoader, ErrorMessage } from '../components/UI';
import api from '../services/api';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/api/organizations/activity/');
      setActivities(response.data.activities || []);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
      setError('Failed to load activity feed');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/organizations/activity/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const getImageUrl = (index, actionType) => {
    const colors = {
      conversation_created: '3498db',
      conversation_replied: '2ecc71',
      decision_created: 'f39c12',
      decision_approved: '9b59b6',
      decision_implemented: 'e74c3c',
      user_joined: '1abc9c'
    };
    const heights = [250, 300, 350, 280, 320, 270];
    return `https://via.placeholder.com/400x${heights[index % heights.length]}/${colors[actionType] || '95a5a6'}/ffffff?text=${actionType.toUpperCase().replace('_', ' ')}`;
  };

  const getActionIcon = (actionType) => {
    const icons = {
      conversation_created: '📝',
      conversation_replied: '💬',
      decision_created: '⚡',
      decision_approved: '✓',
      decision_implemented: '🎯',
      user_joined: '👤',
    };
    return icons[actionType] || '•';
  };

  const handleItemClick = (activity) => {
    if (activity.content?.type === 'conversation') {
      navigate(`/conversations/${activity.content.id}`);
    } else if (activity.content?.type === 'decision') {
      navigate('/decisions');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'JUST NOW';
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-2 border-black p-4">
            <div className="text-xs font-bold tracking-wider mb-1">TODAY</div>
            <div className="text-3xl font-bold">{stats.today}</div>
          </div>
          <div className="bg-white border-2 border-black p-4">
            <div className="text-xs font-bold tracking-wider mb-1">THIS WEEK</div>
            <div className="text-3xl font-bold">{stats.this_week}</div>
          </div>
          <div className="bg-white border-2 border-black p-4">
            <div className="text-xs font-bold tracking-wider mb-1">ALL TIME</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>
        </div>
      )}

      {/* Activity Masonry Grid */}
      {activities.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-xl font-bold mb-2">NO ACTIVITY YET</div>
          <div className="text-gray-600">Activity will appear here as your team collaborates</div>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              onClick={() => handleItemClick(activity)}
              className="break-inside-avoid"
            >
              <div className="bg-white border-2 border-black overflow-hidden hover:shadow-xl transition-shadow duration-300 group cursor-pointer">
                {/* Image */}
                <div className="relative overflow-hidden bg-gray-100">
                  <img 
                    src={getImageUrl(index, activity.action_type)} 
                    alt="" 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-white text-2xl mb-2">
                        {getActionIcon(activity.action_type)}
                      </div>
                      <div className="text-white text-xs font-bold tracking-wider uppercase">
                        {formatTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-black text-white text-xs font-bold uppercase tracking-wide">
                      {activity.action_display}
                    </span>
                  </div>
                  
                  {activity.content && (
                    <h3 className="text-lg font-bold text-black mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                      {activity.content.title}
                    </h3>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-3 border-t-2 border-gray-200">
                    <div className="w-8 h-8 bg-black flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {activity.actor.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-black">{activity.actor.name}</div>
                      <div className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                        {activity.actor.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
