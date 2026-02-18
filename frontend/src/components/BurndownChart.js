import React, { useState, useEffect } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const BurndownChart = ({ sprintId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBurndownData();
  }, [sprintId]);

  const loadBurndownData = async () => {
    try {
      const response = await api.get(`/api/agile/sprints/${sprintId}/burndown/`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load burndown data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading burndown chart...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  const maxPoints = data.total_points;
  const chartHeight = 300;
  const chartWidth = 600;
  const padding = 40;

  const getY = (points) => {
    return chartHeight - padding - ((points / maxPoints) * (chartHeight - 2 * padding));
  };

  const getX = (index, total) => {
    return padding + ((index / (total - 1)) * (chartWidth - 2 * padding));
  };

  const idealPoints = data.ideal_line.map((point, i) => ({
    x: getX(i, data.ideal_line.length),
    y: getY(point.remaining),
    date: point.date
  }));

  const actualPoints = data.actual_line.map((point, i) => ({
    x: getX(i, data.ideal_line.length),
    y: getY(point.remaining),
    date: point.date
  }));

  const idealPath = idealPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const actualPath = actualPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChartBarIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Burndown Chart</h3>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-gray-400"></div>
            <span className="text-gray-600">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-600"></div>
            <span className="text-gray-600">Actual</span>
          </div>
          <div className="ml-auto text-gray-600">
            Total: <span className="font-semibold">{data.total_points} points</span>
          </div>
        </div>

        <svg width={chartWidth} height={chartHeight} className="w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = getY(maxPoints * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {Math.round(maxPoints * (1 - ratio))}
                </text>
              </g>
            );
          })}

          {/* Ideal line */}
          <path
            d={idealPath}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Actual line */}
          <path
            d={actualPath}
            fill="none"
            stroke="#9333ea"
            strokeWidth="3"
          />

          {/* Actual points */}
          {actualPoints.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#9333ea"
            />
          ))}

          {/* X-axis labels */}
          {idealPoints.map((point, i) => {
            if (i % Math.ceil(idealPoints.length / 5) === 0 || i === idealPoints.length - 1) {
              return (
                <text
                  key={i}
                  x={point.x}
                  y={chartHeight - padding + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Start Date</div>
          <div className="text-sm font-semibold">{new Date(data.start_date).toLocaleDateString()}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">End Date</div>
          <div className="text-sm font-semibold">{new Date(data.end_date).toLocaleDateString()}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600">Remaining</div>
          <div className="text-sm font-semibold text-purple-600">
            {actualPoints[actualPoints.length - 1] ? 
              Math.round(data.total_points - (data.total_points - actualPoints[actualPoints.length - 1].y * maxPoints / (chartHeight - 2 * padding))) : 
              data.total_points} points
          </div>
        </div>
      </div>
    </div>
  );
};

export const SprintTimeTracking = ({ sprintId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeTracking();
  }, [sprintId]);

  const loadTimeTracking = async () => {
    try {
      const response = await api.get(`/api/agile/sprints/${sprintId}/time-tracking/`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load time tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Loading...</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Time Tracking Summary</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Estimated</div>
          <div className="text-2xl font-bold text-blue-900">{formatTime(data.total_estimated_minutes)}</div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-sm text-purple-600 mb-1">Logged</div>
          <div className="text-2xl font-bold text-purple-900">{formatTime(data.total_logged_minutes)}</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-600 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-green-900">{formatTime(data.total_remaining_minutes)}</div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Issue</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Estimated</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Logged</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{issue.key}</div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">{issue.title}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">{issue.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {issue.estimated_minutes ? formatTime(issue.estimated_minutes) : '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-purple-600">
                  {formatTime(issue.logged_minutes)}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  {issue.remaining_minutes ? formatTime(issue.remaining_minutes) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
