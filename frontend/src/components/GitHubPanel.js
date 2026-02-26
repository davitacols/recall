import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';


export default function GitHubPanel({ decisionId }) {
  const { darkMode } = useTheme();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [prUrl, setPrUrl] = useState('');
  const [linking, setLinking] = useState(false);

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  useEffect(() => {
    fetchPRs();
  }, [decisionId]);

  const fetchPRs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/integrations/github/prs/${decisionId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPrs(data);
    } catch (error) {
      console.error('Failed to fetch PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPR = async (e) => {
    e.preventDefault();
    setLinking(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/integrations/github/link/${decisionId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pr_url: prUrl })
      });

      if (response.ok) {
        setPrUrl('');
        setShowLinkForm(false);
        fetchPRs();
      } else {
        alert('Failed to link PR');
      }
    } catch (error) {
      alert('Error linking PR');
    } finally {
      setLinking(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'merged') return '#10b981';
    if (status === 'closed') return '#ef4444';
    return '#3b82f6';
  };

  if (loading) return null;

  return (
    <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: textColor }}>Development</h3>
        <button
          onClick={() => setShowLinkForm(!showLinkForm)}
          style={{ padding: '6px 12px', backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`, borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
        >
          {showLinkForm ? 'Cancel' : 'Link PR'}
        </button>
      </div>

      {showLinkForm && (
        <form onSubmit={handleLinkPR} style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <input
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            style={{ flex: 1, padding: '8px 10px', border: `1px solid ${borderColor}`, borderRadius: '5px', backgroundColor: bgColor, color: textColor, fontSize: '13px' }}
            required
          />
          <button
            type="submit"
            disabled={linking}
            style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '5px', fontSize: '13px', fontWeight: 500, cursor: linking ? 'not-allowed' : 'pointer', opacity: linking ? 0.5 : 1 }}
          >
            {linking ? 'Linking...' : 'Link'}
          </button>
        </form>
      )}

      {prs.length === 0 ? (
        <p style={{ fontSize: '13px', color: secondaryText }}>No pull requests linked</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {prs.map(pr => (
            <div key={pr.id} style={{ padding: '12px', border: `1px solid ${borderColor}`, borderRadius: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <a
                    href={pr.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '14px', fontWeight: 500, color: '#3b82f6', textDecoration: 'none' }}
                  >
                    #{pr.pr_number}: {pr.title}
                  </a>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: secondaryText }}>
                    <span>{pr.branch_name}</span>
                    <span>by {pr.author}</span>
                    {pr.commits_count > 0 && <span>{pr.commits_count} commits</span>}
                  </div>
                </div>
                <span style={{ padding: '4px 8px', backgroundColor: `${getStatusColor(pr.status)}20`, color: getStatusColor(pr.status), borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                  {pr.status}
                </span>
              </div>
              {pr.merged_at && (
                <p style={{ fontSize: '11px', color: secondaryText }}>
                  Merged {new Date(pr.merged_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: darkMode ? '#292524' : '#f3f4f6', borderRadius: '5px' }}>
        <p style={{ fontSize: '11px', color: secondaryText, marginBottom: '4px' }}>
          <strong>Tip:</strong> Reference this decision in commits or PR titles
        </p>
        <code style={{ fontSize: '11px', color: textColor }}>
          RECALL-{decisionId} Add feature
        </code>
      </div>
    </div>
  );
}


