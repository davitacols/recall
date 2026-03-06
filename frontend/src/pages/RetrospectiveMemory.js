import React, { useState, useEffect } from 'react';
import api from '../services/api';

function RetrospectiveMemory() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/api/agile/rca/recurring/?days=90');
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Failed to load retrospective data</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-3">Retrospectives</h1>
        <p className="text-xl text-gray-600">Not a meeting replacement — a memory builder</p>
      </div>

      {insights.top_causes && insights.top_causes.length > 0 && (
        <div className="border-2 border-amber-200 bg-amber-50 p-8 mb-8">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">Recurring Root Causes</h2>
          <p className="text-base text-amber-800 mb-6">
            These topics keep coming up in retrospectives. Time to address them systematically.
          </p>
          <div className="space-y-3">
            {insights.top_causes.map((issue, idx) => (
              <div key={idx} className="bg-white border border-amber-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">{issue.keyword}</span>
                  <span className="px-3 py-1 bg-amber-600 text-white text-sm font-bold">
                    risk {issue.risk_score}
                  </span>
                </div>
                <p className="text-sm text-amber-800 mt-2">
                  Mentions: {issue.mentions} | Affected sprints: {issue.affected_sprints} | Recurrence rate: {issue.recurrence_rate}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.blocker_patterns && insights.blocker_patterns.length > 0 && (
        <div className="border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recurring Blocker Patterns</h2>
          <div className="space-y-3">
            {insights.blocker_patterns.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-base text-gray-700">
                  {item.blocker_type}: {item.count} blockers (avg {item.avg_days_open} days open)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="border border-gray-200 p-6 mt-8 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recommended Actions</h2>
          <div className="space-y-3">
            {insights.recommendations.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-base text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!insights.top_causes || insights.top_causes.length === 0) && (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No patterns detected yet</h3>
          <p className="text-lg text-gray-600">
            Run more retrospectives to detect recurring issues
          </p>
        </div>
      )}
    </div>
  );
}

export default RetrospectiveMemory;
