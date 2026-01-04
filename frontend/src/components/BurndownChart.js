import React, { useState, useEffect } from 'react';
import { colors, spacing, radius } from '../utils/designTokens';

function BurndownChart({ sprint }) {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (sprint) {
      const totalIssues = sprint.issue_count || 0;
      const completedIssues = sprint.completed || 0;
      const remainingIssues = totalIssues - completedIssues;

      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      const today = new Date();
      const daysTotal = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const daysElapsed = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, daysTotal - daysElapsed);

      const idealBurnPerDay = totalIssues > 0 ? totalIssues / daysTotal : 0;
      const idealRemaining = Math.max(0, totalIssues - (idealBurnPerDay * daysElapsed));

      setChartData({
        totalIssues,
        completedIssues,
        remainingIssues,
        daysElapsed,
        daysTotal,
        daysRemaining,
        idealRemaining,
        completionPercentage: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0
      });
    }
  }, [sprint]);

  if (!chartData) {
    return <div style={{ padding: spacing.lg, color: colors.secondary }}>Loading chart...</div>;
  }

  const maxIssues = Math.max(chartData.totalIssues, 1);
  const chartHeight = 200;
  const chartWidth = 400;

  const actualY = (chartData.remainingIssues / maxIssues) * chartHeight;
  const xPos = chartData.daysTotal > 0 ? (chartData.daysElapsed / chartData.daysTotal) * chartWidth : 0;

  return (
    <div style={{
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: spacing.lg
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: colors.primary, marginBottom: spacing.lg }}>
        Sprint Burndown
      </h3>

      <div style={{ display: 'flex', gap: spacing.xl }}>
        <div style={{ flex: 1 }}>
          <svg width={chartWidth} height={chartHeight} style={{ border: `1px solid ${colors.border}` }}>
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line
                key={`grid-${i}`}
                x1={pct * chartWidth}
                y1={0}
                x2={pct * chartWidth}
                y2={chartHeight}
                stroke={colors.border}
                strokeDasharray="4"
                strokeWidth="1"
              />
            ))}

            <line
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={0}
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeDasharray="5"
            />

            <circle
              cx={xPos}
              cy={chartHeight - actualY}
              r="4"
              fill={chartData.remainingIssues <= chartData.idealRemaining ? '#10B981' : '#F59E0B'}
            />

            <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={colors.primary} strokeWidth="2" />
            <line x1={0} y1={0} x2={0} y2={chartHeight} stroke={colors.primary} strokeWidth="2" />
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.md, fontSize: '11px', color: colors.secondary }}>
            <span>Day 0</span>
            <span>Day {chartData.daysTotal}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg, minWidth: '150px' }}>
          <div>
            <div style={{ fontSize: '11px', color: colors.secondary, marginBottom: '4px' }}>Completion</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>
              {chartData.completionPercentage}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: colors.secondary, marginBottom: '4px' }}>Remaining</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F59E0B' }}>
              {chartData.remainingIssues}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: colors.secondary, marginBottom: '4px' }}>Days Left</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: colors.primary }}>
              {chartData.daysRemaining}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: colors.secondary, marginBottom: '4px' }}>Status</div>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: chartData.remainingIssues <= chartData.idealRemaining ? '#10B981' : '#F59E0B',
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: chartData.remainingIssues <= chartData.idealRemaining ? '#D1FAE5' : '#FEF3C7',
              borderRadius: radius.md,
              textAlign: 'center'
            }}>
              {chartData.remainingIssues <= chartData.idealRemaining ? 'On Track' : 'Behind'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: spacing.lg, fontSize: '11px', color: colors.secondary }}>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#9CA3AF', marginRight: '4px' }}></span>
          Ideal burndown
        </div>
        <div>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#F59E0B', borderRadius: '50%', marginRight: '4px' }}></span>
          Actual progress
        </div>
      </div>
    </div>
  );
}

export default BurndownChart;
