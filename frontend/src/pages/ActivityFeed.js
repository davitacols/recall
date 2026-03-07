import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import BrandedTechnicalIllustration from '../components/BrandedTechnicalIllustration';
import { getProjectPalette, getProjectUi } from '../utils/projectUi';

export default function ActivityFeed() {
  const { darkMode } = useTheme();
  const [activities, setActivities] = useState([]);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const [convs, decs, goals] = await Promise.all([
        api.get('/api/conversations/').catch(() => ({ data: [] })),
        api.get('/api/decisions/').catch(() => ({ data: [] })),
        api.get('/api/business/goals/').catch(() => ({ data: [] }))
      ]);
      
      const combined = [
        ...(convs.data.results || convs.data || []).map(c => ({ ...c, type: 'conversation', action: 'created' })),
        ...(decs.data.results || decs.data || []).map(d => ({ ...d, type: 'decision', action: 'created' })),
        ...(goals.data || []).map(g => ({ ...g, type: 'goal', action: 'created' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
      
      setActivities(combined);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const getIcon = (type) => {
    const colors = { conversation: palette.info, decision: palette.success, goal: palette.warn };
    return <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors[type] || 'var(--app-muted)' }} />;
  };

  return (
    <div style={{ ...ui.container, display: 'grid', gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: 'clamp(16px,2.4vw,24px)',
          background: `linear-gradient(138deg, ${palette.accentSoft}, ${darkMode ? 'rgba(96,165,250,0.14)' : 'rgba(191,219,254,0.42)'})`,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          alignItems: 'end',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', fontWeight: 700, color: palette.muted }}>TIMELINE</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem,2vw,1.56rem)', color: palette.text }}>Activity Feed</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Live stream of conversation, decision, and goal updates.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activities.map((activity, i) => (
          <div key={i} style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getIcon(activity.type)}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: palette.text, margin: 0 }}>
                <strong>{activity.author || activity.created_by || 'Someone'}</strong> {activity.action} a <span style={{ textTransform: 'capitalize' }}>{activity.type}</span>: <strong>{activity.title || 'Untitled'}</strong>
              </p>
              <p style={{ fontSize: '12px', color: palette.muted, marginTop: '4px', marginBottom: 0 }}>{new Date(activity.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
