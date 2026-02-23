import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { ExclamationTriangleIcon, LightBulbIcon, ChartBarIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function AdvancedAIInsights() {
  const { darkMode } = useTheme();
  const [bottlenecks, setBottlenecks] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [successRates, setSuccessRates] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [bottlenecksRes, gapsRes, patternsRes, ratesRes] = await Promise.all([
        fetch('http://localhost:8000/api/knowledge/ai/bottlenecks/', { headers }),
        fetch('http://localhost:8000/api/knowledge/ai/knowledge-gaps/', { headers }),
        fetch('http://localhost:8000/api/knowledge/ai/patterns/', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'decision' })
        }),
        fetch('http://localhost:8000/api/knowledge/ai/success-rates/', { headers })
      ]);

      const [bottlenecksData, gapsData, patternsData, ratesData] = await Promise.all([
        bottlenecksRes.json(),
        gapsRes.json(),
        patternsRes.json(),
        ratesRes.json()
      ]);

      setBottlenecks(bottlenecksData.bottlenecks || []);
      setGaps(gapsData.gaps || []);
      setPatterns(patternsData.patterns || []);
      setSuccessRates(ratesData);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (darkMode) {
      return severity === 'high' ? 'bg-red-900/20 border-red-800 text-red-400' :
             severity === 'medium' ? 'bg-yellow-900/20 border-yellow-800 text-yellow-400' :
             'bg-blue-900/20 border-blue-800 text-blue-400';
    }
    return severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
           severity === 'medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
           'bg-blue-50 border-blue-200 text-blue-700';
  };

  if (loading) {
    return (
      <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>
        <div className="animate-pulse space-y-3">
          <div className={`h-4 ${darkMode ? 'bg-stone-800' : 'bg-gray-200'} rounded w-1/2`}></div>
          <div className={`h-4 ${darkMode ? 'bg-stone-800' : 'bg-gray-200'} rounded w-3/4`}></div>
        </div>
      </div>
    );
  }

  const hasInsights = bottlenecks.length > 0 || gaps.length > 0 || patterns.length > 0;

  return (
    <div className="space-y-4">
      {/* Success Rates */}
      {successRates && successRates.overall.decisions.total > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className={`w-5 h-5 ${textSecondary}`} />
            <h3 className={`text-sm font-semibold ${textPrimary}`}>Success Rates</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{successRates.overall.decisions.rate}%</p>
              <p className={`text-xs ${textSecondary}`}>Overall ({successRates.overall.decisions.successful}/{successRates.overall.decisions.total})</p>
            </div>
            {Object.entries(successRates.by_impact).map(([impact, data]) => (
              data.total > 0 && (
                <div key={impact}>
                  <p className={`text-lg font-bold ${textPrimary}`}>{Math.round(data.rate)}%</p>
                  <p className={`text-xs ${textSecondary} capitalize`}>{impact} impact</p>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            <h3 className={`text-sm font-semibold ${textPrimary}`}>Bottlenecks Detected</h3>
          </div>
          <div className="space-y-2">
            {bottlenecks.map((bottleneck, idx) => (
              <div key={idx} className={`p-3 border rounded ${getSeverityColor(bottleneck.severity)}`}>
                <p className="text-sm font-medium">{bottleneck.message}</p>
                {bottleneck.items && bottleneck.items.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {bottleneck.items.map((item, i) => (
                      <li key={i} className="text-xs">• {item.title}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <DocumentMagnifyingGlassIcon className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <h3 className={`text-sm font-semibold ${textPrimary}`}>Knowledge Gaps</h3>
          </div>
          <div className="space-y-2">
            {gaps.map((gap, idx) => (
              <div key={idx} className={`p-3 border rounded ${getSeverityColor(gap.severity)}`}>
                <p className="text-sm font-medium">{gap.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <LightBulbIcon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-sm font-semibold ${textPrimary}`}>Patterns Detected</h3>
          </div>
          <div className="space-y-2">
            {patterns.map((pattern, idx) => (
              <div key={idx} className={`p-3 border ${borderColor} rounded`}>
                <p className={`text-sm ${textPrimary}`}>{pattern.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasInsights && !successRates && (
        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6 text-center`}>
          <p className={`text-sm ${textSecondary}`}>No insights available yet. Keep working and check back later!</p>
        </div>
      )}
    </div>
  );
}
