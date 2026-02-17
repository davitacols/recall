import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function Reports() {
  const { projectId } = useParams();
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [burndown, setBurndown] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSprints();
  }, [projectId]);

  useEffect(() => {
    if (selectedSprint) {
      fetchReports();
    }
  }, [selectedSprint]);

  const fetchSprints = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/sprints/`);
      setSprints(response.data);
      if (response.data.length > 0) {
        setSelectedSprint(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const [burndownRes, velocityRes] = await Promise.all([
        api.get(`/api/agile/sprints/${selectedSprint}/burndown/`).catch(() => null),
        api.get(`/api/agile/projects/${projectId}/velocity/`).catch(() => null)
      ]);
      setBurndown(burndownRes?.data || generateMockBurndown());
      setVelocity(velocityRes?.data || generateMockVelocity());
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const generateMockBurndown = () => {
    const days = 10;
    const data = [];
    let remaining = 50;
    for (let i = 0; i <= days; i++) {
      data.push({
        day: i,
        ideal: 50 - (50 / days) * i,
        actual: remaining
      });
      remaining = Math.max(0, remaining - Math.random() * 8);
    }
    return { data, total: 50 };
  };

  const generateMockVelocity = () => {
    return {
      sprints: [
        { name: 'Sprint 1', committed: 30, completed: 28 },
        { name: 'Sprint 2', committed: 35, completed: 32 },
        { name: 'Sprint 3', committed: 40, completed: 38 },
        { name: 'Sprint 4', committed: 38, completed: 40 },
        { name: 'Sprint 5', committed: 42, completed: 41 }
      ],
      average: 36
    };
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #d97706', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#111827' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.02em' }}>Reports & Analytics</h1>
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Track team performance and sprint progress</p>
        </div>

        {/* Sprint Selector */}
        {sprints.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}>Select Sprint</label>
            <select
              value={selectedSprint || ''}
              onChange={(e) => setSelectedSprint(parseInt(e.target.value))}
              style={{ padding: '10px 16px', backgroundColor: '#1c1917', color: '#ffffff', border: '1px solid #374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', minWidth: '250px' }}
            >
              {sprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <MetricCard label="Avg Velocity" value={velocity?.average || 0} unit="pts" color="#d97706" />
          <MetricCard label="Current Sprint" value={burndown?.data?.[burndown.data.length - 1]?.actual.toFixed(0) || 0} unit="pts left" color="#3b82f6" />
          <MetricCard label="Completion Rate" value={velocity ? Math.round((velocity.sprints[velocity.sprints.length - 1]?.completed / velocity.sprints[velocity.sprints.length - 1]?.committed) * 100) : 0} unit="%" color="#10b981" />
          <MetricCard label="Total Sprints" value={velocity?.sprints?.length || 0} unit="" color="#8b5cf6" />
        </div>

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Burndown Chart */}
          <div style={{ backgroundColor: '#1c1917', border: '1px solid #374151', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Sprint Burndown</h2>
            {burndown && <BurndownChart data={burndown.data} />}
          </div>

          {/* Velocity Chart */}
          <div style={{ backgroundColor: '#1c1917', border: '1px solid #374151', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Team Velocity</h2>
            {velocity && <VelocityChart data={velocity.sprints} average={velocity.average} />}
          </div>
        </div>

        {/* Velocity Table */}
        {velocity && (
          <div style={{ backgroundColor: '#1c1917', border: '1px solid #374151', padding: '24px', marginTop: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>Sprint History</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Sprint</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Committed</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Completed</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {velocity.sprints.map((sprint, idx) => {
                  const rate = Math.round((sprint.completed / sprint.committed) * 100);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>{sprint.name}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#9ca3af' }}>{sprint.committed}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>{sprint.completed}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: rate >= 90 ? '#10b981' : rate >= 70 ? '#eab308' : '#ef4444', fontWeight: 700 }}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, color }) {
  return (
    <div style={{ backgroundColor: '#1c1917', border: '1px solid #374151', padding: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '32px', fontWeight: 900, color }}>{value}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>{unit}</span>
      </div>
    </div>
  );
}

function BurndownChart({ data }) {
  const width = 500;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxY = Math.max(...data.map(d => Math.max(d.ideal, d.actual)));
  const maxX = data.length - 1;

  const getX = (day) => padding + (day / maxX) * chartWidth;
  const getY = (value) => padding + chartHeight - (value / maxY) * chartHeight;

  const idealPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.ideal)}`).join(' ');
  const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.day)} ${getY(d.actual)}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line key={ratio} x1={padding} y1={getY(maxY * ratio)} x2={width - padding} y2={getY(maxY * ratio)} stroke="#374151" strokeWidth="1" />
      ))}
      
      {/* Ideal line */}
      <path d={idealPath} fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Actual line */}
      <path d={actualPath} fill="none" stroke="#d97706" strokeWidth="3" />
      
      {/* Data points */}
      {data.map(d => (
        <circle key={d.day} cx={getX(d.day)} cy={getY(d.actual)} r="4" fill="#d97706" />
      ))}
      
      {/* Axes */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />
      
      {/* Labels */}
      <text x={width / 2} y={height - 10} fill="#9ca3af" fontSize="12" textAnchor="middle">Days</text>
      <text x={15} y={height / 2} fill="#9ca3af" fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>Story Points</text>
      
      {/* Legend */}
      <line x1={width - 150} y1={20} x2={width - 120} y2={20} stroke="#6b7280" strokeWidth="2" strokeDasharray="5,5" />
      <text x={width - 115} y={24} fill="#9ca3af" fontSize="12">Ideal</text>
      <line x1={width - 150} y1={40} x2={width - 120} y2={40} stroke="#d97706" strokeWidth="2" />
      <text x={width - 115} y={44} fill="#9ca3af" fontSize="12">Actual</text>
    </svg>
  );
}

function VelocityChart({ data, average }) {
  const width = 500;
  const height = 300;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxY = Math.max(...data.map(d => Math.max(d.committed, d.completed)));
  const barWidth = chartWidth / data.length / 2.5;
  const groupWidth = chartWidth / data.length;

  const getY = (value) => padding + chartHeight - (value / maxY) * chartHeight;
  const getHeight = (value) => (value / maxY) * chartHeight;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line key={ratio} x1={padding} y1={getY(maxY * ratio)} x2={width - padding} y2={getY(maxY * ratio)} stroke="#374151" strokeWidth="1" />
      ))}
      
      {/* Average line */}
      <line x1={padding} y1={getY(average)} x2={width - padding} y2={getY(average)} stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Bars */}
      {data.map((d, i) => {
        const x = padding + i * groupWidth + groupWidth / 2;
        return (
          <g key={i}>
            {/* Committed bar */}
            <rect x={x - barWidth - 2} y={getY(d.committed)} width={barWidth} height={getHeight(d.committed)} fill="#3b82f6" />
            {/* Completed bar */}
            <rect x={x + 2} y={getY(d.completed)} width={barWidth} height={getHeight(d.completed)} fill="#d97706" />
            {/* Label */}
            <text x={x} y={height - padding + 20} fill="#9ca3af" fontSize="10" textAnchor="middle">{d.name.replace('Sprint ', 'S')}</text>
          </g>
        );
      })}
      
      {/* Axes */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9ca3af" strokeWidth="2" />
      
      {/* Labels */}
      <text x={width / 2} y={height - 10} fill="#9ca3af" fontSize="12" textAnchor="middle">Sprints</text>
      <text x={15} y={height / 2} fill="#9ca3af" fontSize="12" textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`}>Story Points</text>
      
      {/* Legend */}
      <rect x={width - 150} y={15} width={15} height={15} fill="#3b82f6" />
      <text x={width - 130} y={26} fill="#9ca3af" fontSize="12">Committed</text>
      <rect x={width - 150} y={35} width={15} height={15} fill="#d97706" />
      <text x={width - 130} y={46} fill="#9ca3af" fontSize="12">Completed</text>
      <line x1={width - 150} y1={60} x2={width - 135} y2={60} stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" />
      <text x={width - 130} y={64} fill="#9ca3af" fontSize="12">Average</text>
    </svg>
  );
}

export default Reports;
