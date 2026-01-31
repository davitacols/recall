import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ListBulletIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [currentSprint, setCurrentSprint] = useState(null);
  const [todayActivity, setTodayActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDecisions: 0,
    activeIssues: 0,
    teamMembers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [convRes, decRes, sprintRes] = await Promise.all([
        api.get('/api/conversations/').catch(() => ({ data: [] })),
        api.get('/api/decisions/').catch(() => ({ data: [] })),
        api.get('/api/agile/current-sprint/').catch(() => ({ data: null }))
      ]);
      
      const convData = convRes.data.results || convRes.data.data || convRes.data || [];
      const allConvs = Array.isArray(convData) ? convData : [];
      const decData = decRes.data.results || decRes.data.data || decRes.data || [];
      const allDecs = Array.isArray(decData) ? decData : [];
      
      // Get today's activity
      const today = new Date().toDateString();
      const todayConvs = allConvs.filter(c => c && c.created_at && new Date(c.created_at).toDateString() === today);
      const todayDecs = allDecs.filter(d => d && d.created_at && new Date(d.created_at).toDateString() === today);
      
      const activity = [
        ...todayConvs.map(c => ({
          type: 'conversation',
          title: c.title,
          author: c.author,
          time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          postType: c.post_type
        })),
        ...todayDecs.map(d => ({
          type: 'decision',
          title: d.title,
          author: d.decision_maker,
          time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: d.status
        }))
      ].sort((a, b) => new Date(b.time) - new Date(a.time));
      
      setStats({
        totalConversations: allConvs.length,
        totalDecisions: allDecs.length,
        activeIssues: currentSprint?.issue_count || 0,
        teamMembers: 0
      });
      
      setTodayActivity(activity);
      setConversations(allConvs.filter(c => c && c.id).slice(0, 5));
      setDecisions(allDecs.filter(d => d && d.id).slice(0, 5));
      setCurrentSprint(sprintRes.data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-1">Welcome back, {user?.full_name?.split(' ')[0]}</h1>
              <p className="text-gray-600">Your organizational memory at a glance</p>
            </div>
            <Link to="/conversations/new" className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all">
              + New Conversation
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-gray-900 p-6 hover:shadow-md transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Conversations</span>
              <ChatBubbleLeftIcon className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.totalConversations}</p>
            <p className="text-xs text-gray-500 mt-2">Organizational knowledge</p>
          </div>
          
          <div className="bg-white border-2 border-gray-900 p-6 hover:shadow-md transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Decisions</span>
              <DocumentTextIcon className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.totalDecisions}</p>
            <p className="text-xs text-gray-500 mt-2">Tracked & documented</p>
          </div>
          
          <div className="bg-white border-2 border-gray-900 p-6 hover:shadow-md transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Active Issues</span>
              <ListBulletIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{currentSprint?.issue_count || 0}</p>
            <p className="text-xs text-gray-500 mt-2">In current sprint</p>
          </div>
          
          <div className="bg-white border-2 border-gray-900 p-6 hover:shadow-md transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Memory Health</span>
              <SparklesIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">85%</p>
            <p className="text-xs text-gray-500 mt-2">Knowledge captured</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Activity */}
            <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
              <h2 className="text-xl font-black text-gray-900 mb-6">Today's Activity</h2>
              
              {todayActivity.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No activity yet today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 border border-gray-200 hover:border-gray-900 transition-all">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 truncate">{activity.title}</h3>
                          <span className="text-xs text-gray-500 flex-shrink-0">{activity.time}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs font-bold uppercase bg-gray-100 text-gray-700 px-2 py-1">
                            {activity.postType || activity.status}
                          </span>
                          <span className="text-xs text-gray-600">by {activity.author}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Current Sprint */}
            {currentSprint && (
              <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{currentSprint.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{currentSprint.start_date} → {currentSprint.end_date}</p>
                  </div>
                  <Link to="/sprint" className="flex items-center gap-2 text-gray-900 hover:text-black font-bold text-sm">
                    View <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 p-4 text-center shadow-sm">
                    <p className="text-2xl font-black text-green-600">{currentSprint.completed_count || currentSprint.completed || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Completed</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-4 text-center shadow-sm">
                    <p className="text-2xl font-black text-blue-600">{currentSprint.in_progress || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">In Progress</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-4 text-center shadow-sm">
                    <p className="text-2xl font-black text-gray-600">{(currentSprint.issue_count || 0) - (currentSprint.completed_count || currentSprint.completed || 0) - (currentSprint.in_progress || 0) - (currentSprint.blocked_count || currentSprint.blocked || 0)}</p>
                    <p className="text-xs text-gray-600 mt-1">To Do</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 text-center shadow-sm">
                    <p className="text-2xl font-black text-amber-600">{currentSprint.blocked_count || currentSprint.blocked || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Blocked</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Conversations */}
            <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">Recent Conversations</h2>
                <Link to="/conversations" className="text-gray-600 hover:text-gray-900 font-bold text-sm">View All →</Link>
              </div>
              
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <ChatBubbleLeftIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map(conv => (
                    <Link key={conv.id} to={`/conversations/${conv.id}`} className="flex items-start gap-4 p-4 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                      <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{conv.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold uppercase bg-gray-100 text-gray-700 px-2 py-1">{conv.post_type}</span>
                          <span className="text-xs text-gray-500">{conv.reply_count} replies</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{new Date(conv.created_at).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Recent Decisions */}
            <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">Recent Decisions</h2>
                <Link to="/decisions" className="text-gray-600 hover:text-gray-900 font-bold text-sm">All →</Link>
              </div>
              
              {decisions.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No decisions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map(dec => (
                    <Link key={dec.id} to={`/decisions/${dec.id}`} className="block p-3 border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{dec.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold uppercase text-gray-600 bg-gray-100 px-2 py-1">{dec.status}</span>
                        <span className="text-xs text-gray-500">{dec.impact_level}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-gray-900 p-8 shadow-sm">
              <h2 className="text-xl font-black text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link to="/conversations/new" className="block w-full px-4 py-3 bg-gray-900 text-white hover:bg-black font-bold text-sm text-center transition-all">
                  New Conversation
                </Link>
                <Link to="/decisions/new" className="block w-full px-4 py-3 border border-gray-900 text-gray-900 hover:bg-gray-50 font-bold text-sm text-center transition-all">
                  New Decision
                </Link>
                <Link to="/sprint" className="block w-full px-4 py-3 border border-gray-200 text-gray-900 hover:bg-gray-50 font-bold text-sm text-center transition-all">
                  View Sprint
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
