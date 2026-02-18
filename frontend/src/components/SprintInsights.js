import React, { useState, useEffect } from 'react';
import { SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const SprintInsights = ({ sprintId }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, [sprintId]);

  const fetchInsights = async () => {
    try {
      const response = await api.get(`/api/agile/ml/sprint-insights/${sprintId}/`);
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const healthColor = insights.health_score >= 80 ? 'green' : insights.health_score >= 60 ? 'yellow' : 'red';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">AI Sprint Insights</h2>
        </div>
        <div className={`px-4 py-2 rounded-full font-bold ${
          healthColor === 'green' ? 'bg-green-100 text-green-800' :
          healthColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          Health: {insights.health_score}%
        </div>
      </div>

      {/* Prediction */}
      <div className={`p-4 rounded-lg border-2 ${
        insights.prediction.at_risk ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900">Completion Prediction</span>
          <span className="text-2xl font-bold">{insights.prediction.probability}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              insights.prediction.at_risk ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${insights.prediction.probability}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {insights.prediction.completed} of {insights.prediction.total} issues completed
        </p>
      </div>

      {/* Sentiment Analysis */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Team Sentiment</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{insights.sentiment_analysis.urgent}</div>
            <div className="text-xs text-red-700 font-medium">Urgent</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{insights.sentiment_analysis.negative}</div>
            <div className="text-xs text-orange-700 font-medium">Negative</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{insights.sentiment_analysis.neutral}</div>
            <div className="text-xs text-gray-700 font-medium">Neutral</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{insights.sentiment_analysis.positive}</div>
            <div className="text-xs text-green-700 font-medium">Positive</div>
          </div>
        </div>
      </div>

      {/* Risks */}
      {insights.risks && insights.risks.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            Risk Factors
          </h3>
          <div className="space-y-2">
            {insights.risks.map((risk, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights.health_score < 80 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            Recommendations
          </h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {insights.prediction.at_risk && (
              <li>• Consider reducing scope or extending sprint duration</li>
            )}
            {insights.sentiment_analysis.urgent > 2 && (
              <li>• Address urgent issues immediately to prevent blockers</li>
            )}
            {insights.sentiment_analysis.negative > 3 && (
              <li>• Team morale may be low - consider a retrospective</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
