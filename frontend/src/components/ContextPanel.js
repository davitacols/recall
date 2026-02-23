import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { 
  ChatBubbleLeftIcon, 
  DocumentCheckIcon, 
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ContextPanel({ contentType, objectId }) {
  const { darkMode } = useTheme();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-stone-800' : 'hover:bg-gray-50';

  useEffect(() => {
    fetchContext();
  }, [contentType, objectId]);

  const fetchContext = async () => {
    // Check cache first
    const cacheKey = `context_${contentType}_${objectId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 1 hour old
      if (Date.now() - timestamp < 3600000) {
        setContext(data);
        setLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:8000/api/knowledge/context/${contentType}/${objectId}/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) {
        console.error('API error:', res.status, await res.text());
        setContext({ error: true });
        return;
      }
      const data = await res.json();
      console.log('Context data:', data);
      setContext(data);
      
      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error fetching context:', error);
      setContext({ error: true });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 ${darkMode ? 'bg-stone-800' : 'bg-gray-200'} rounded w-3/4`}></div>
          <div className={`h-4 ${darkMode ? 'bg-stone-800' : 'bg-gray-200'} rounded w-1/2`}></div>
        </div>
      </div>
    );
  }

  if (!context || context.error) {
    return (
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
        <h3 className={`font-semibold ${textPrimary} mb-2`}>Context</h3>
        <p className={`text-sm ${textSecondary}`}>
          {context?.error ? 'Unable to load context' : 'No related content yet'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-40 p-3 bg-blue-600 text-white rounded-full shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Context Panel */}
      <div className={`
        lg:relative lg:block
        fixed bottom-0 left-0 right-0 z-50
        lg:transform-none
        transition-transform duration-300
        ${isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        max-h-[80vh] lg:max-h-none overflow-y-auto
        ${bgSecondary} lg:bg-transparent
        rounded-t-2xl lg:rounded-none
        shadow-2xl lg:shadow-none
      `}>
    <div className="space-y-4 p-4 lg:p-0">
      {/* Show placeholder if no data */}
      {!context.related_conversations?.length && 
       !context.related_decisions?.length && 
       !context.expert_users?.length && 
       !context.similar_past_items?.length && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <h3 className={`font-semibold ${textPrimary} mb-2`}>Context Panel</h3>
          <p className={`text-sm ${textSecondary}`}>
            Related content will appear here as you create more conversations and decisions.
          </p>
        </div>
      )}
      
      {/* Related Content */}
      {context.related_conversations?.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />
            <h3 className={`font-semibold ${textPrimary}`}>
              Related Conversations
            </h3>
          </div>
          <div className="space-y-2">
            {context.related_conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/conversations/${conv.id}`}
                className={`block p-2 rounded ${hoverBg} transition`}
              >
                <div className={`text-sm font-medium ${textPrimary}`}>
                  {conv.title}
                </div>
                <div className={`text-xs ${textSecondary}`}>
                  {conv.link_type} • {Math.round(conv.strength * 100)}% relevant
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Decisions */}
      {context.related_decisions?.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <DocumentCheckIcon className="w-5 h-5 text-purple-500" />
            <h3 className={`font-semibold ${textPrimary}`}>
              Related Decisions
            </h3>
          </div>
          <div className="space-y-2">
            {context.related_decisions.map((decision) => (
              <Link
                key={decision.id}
                to={`/decisions/${decision.id}`}
                className={`block p-2 rounded ${hoverBg} transition`}
              >
                <div className={`text-sm font-medium ${textPrimary}`}>
                  {decision.title}
                </div>
                <div className={`text-xs ${textSecondary}`}>
                  {decision.link_type}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Expert Users */}
      {context.expert_users?.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <UserGroupIcon className="w-5 h-5 text-green-500" />
            <h3 className={`font-semibold ${textPrimary}`}>
              Who Knows About This
            </h3>
          </div>
          <div className="space-y-2">
            {context.expert_users.map((expert, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {expert.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${textPrimary}`}>
                    {expert.name}
                  </div>
                  <div className={`text-xs ${textSecondary}`}>
                    {expert.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Context */}
      {context.similar_past_items?.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-5 h-5 text-amber-500" />
            <h3 className={`font-semibold ${textPrimary}`}>
              Historical Context
            </h3>
          </div>
          <div className="space-y-3">
            {context.similar_past_items.map((item, idx) => (
              <div key={idx} className={`p-2 rounded ${darkMode ? 'bg-stone-800' : 'bg-gray-50'}`}>
                <div className={`text-sm font-medium ${textPrimary} mb-1`}>
                  {item.title}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded ${
                    item.was_successful 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {item.outcome}
                  </span>
                  <span className={textSecondary}>
                    {Math.round(item.similarity * 100)}% similar
                  </span>
                </div>
                {item.lessons && (
                  <div className={`mt-2 text-xs ${textSecondary}`}>
                    💡 {item.lessons}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Indicators */}
      {context.risk_indicators?.length > 0 && (
        <div className={`rounded-lg border-2 p-4 ${
          darkMode 
            ? 'bg-amber-900/20 border-amber-700' 
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-500 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className={`font-bold ${darkMode ? 'text-amber-200' : 'text-amber-900'}`}>
              Risk Indicators
            </h3>
          </div>
          <ul className="space-y-2">
            {context.risk_indicators.map((risk, idx) => (
              <li key={idx} className={`flex items-start gap-2 text-sm ${darkMode ? 'text-amber-200' : 'text-amber-900'}`}>
                <span className={`font-bold mt-0.5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>⚠</span>
                <span className="flex-1">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div>
    </>
  );
}
