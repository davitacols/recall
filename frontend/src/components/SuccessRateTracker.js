import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { ExclamationCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function SuccessRateTracker({ contentType, title, description }) {
  const { darkMode } = useTheme();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    if (title || description) {
      checkSimilarFailures();
    }
  }, [title, description]);

  const checkSimilarFailures = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/ai/check-failures/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: contentType || 'decision',
          title: title || '',
          description: description || ''
        })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error checking failures:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!analysis || analysis.warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {analysis.warnings.map((warning, idx) => (
        <div
          key={idx}
          className={`p-4 border rounded-lg ${
            warning.severity === 'high'
              ? (darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')
              : warning.severity === 'medium'
              ? (darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200')
              : (darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200')
          }`}
        >
          <div className="flex items-start gap-3">
            {warning.severity === 'high' ? (
              <XCircleIcon className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
            ) : warning.severity === 'medium' ? (
              <ExclamationCircleIcon className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            ) : (
              <CheckCircleIcon className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            )}
            <div className="flex-1">
              <div className={`text-sm font-semibold mb-2 ${
                warning.severity === 'high'
                  ? (darkMode ? 'text-red-400' : 'text-red-700')
                  : warning.severity === 'medium'
                  ? (darkMode ? 'text-yellow-400' : 'text-yellow-700')
                  : (darkMode ? 'text-blue-400' : 'text-blue-700')
              }`}>
                {warning.message}
              </div>

              {warning.type === 'similar_failure' && warning.items && warning.items.length > 0 && (
                <div className="space-y-2 mt-3">
                  {warning.items.map((item, i) => (
                    <div key={i} className={`p-3 ${bgSecondary} border ${borderColor} rounded text-xs`}>
                      <div className={`font-medium ${textPrimary} mb-1`}>{item.title}</div>
                      <div className={`${textSecondary} mb-1`}>
                        Last attempt: <span className="font-semibold">{item.status}</span> on {item.date}
                      </div>
                      <div className={`${textSecondary}`}>
                        Similarity: {item.similarity}% | Reason: {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {warning.type === 'low_success_rate' && (
                <div className="mt-2">
                  <div className={`text-xs ${textSecondary}`}>
                    Historical success rate for similar items: <span className="font-bold">{warning.success_rate}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        warning.success_rate >= 70 ? 'bg-green-500' :
                        warning.success_rate >= 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${warning.success_rate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {analysis.success_rate !== null && (
        <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg`}>
          <div className={`text-xs font-semibold ${textSecondary} mb-2`}>Overall Success Rate</div>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${textPrimary}`}>{analysis.success_rate}%</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    analysis.success_rate >= 70 ? 'bg-green-500' :
                    analysis.success_rate >= 40 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${analysis.success_rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
