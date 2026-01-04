import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { colors, spacing, radius, shadows } from '../utils/designTokens';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setQuery(q);

    if (q.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    try {
      const [convRes, decRes, issueRes] = await Promise.all([
        api.get(`/api/conversations/?search=${q}`),
        api.get(`/api/decisions/?search=${q}`),
        api.get(`/api/agile/projects/1/issues/?search=${q}`).catch(() => ({ data: [] }))
      ]);

      setResults({
        conversations: convRes.data.results || convRes.data || [],
        decisions: decRes.data || [],
        issues: issueRes.data || []
      });
    } catch (error) {
      console.error('Search failed:', error);
      setResults({ conversations: [], decisions: [], issues: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <MagnifyingGlassIcon style={{
          position: 'absolute',
          left: spacing.md,
          width: '18px',
          height: '18px',
          color: colors.secondary,
          pointerEvents: 'none'
        }} />
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder="Search conversations, decisions, issues..."
          style={{
            width: '100%',
            padding: `${spacing.md} ${spacing.md} ${spacing.md} ${spacing.xl}`,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {showResults && results && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: spacing.sm,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          boxShadow: shadows.lg,
          zIndex: 50,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.secondary }}>
              Searching...
            </div>
          ) : (
            <>
              {results.conversations.length > 0 && (
                <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.secondary,
                    textTransform: 'uppercase'
                  }}>
                    Conversations
                  </div>
                  {results.conversations.slice(0, 3).map(conv => (
                    <Link
                      key={conv.id}
                      to={`/conversations/${conv.id}`}
                      style={{
                        display: 'block',
                        padding: spacing.md,
                        paddingLeft: spacing.lg,
                        color: colors.primary,
                        textDecoration: 'none',
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '13px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 500 }}>{conv.title}</div>
                      <div style={{ fontSize: '11px', color: colors.secondary, marginTop: '2px' }}>
                        {conv.post_type}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.decisions.length > 0 && (
                <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.secondary,
                    textTransform: 'uppercase'
                  }}>
                    Decisions
                  </div>
                  {results.decisions.slice(0, 3).map(dec => (
                    <Link
                      key={dec.id}
                      to={`/decisions/${dec.id}`}
                      style={{
                        display: 'block',
                        padding: spacing.md,
                        paddingLeft: spacing.lg,
                        color: colors.primary,
                        textDecoration: 'none',
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '13px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = colors.background}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 500 }}>{dec.title}</div>
                      <div style={{ fontSize: '11px', color: colors.secondary, marginTop: '2px' }}>
                        {dec.status}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.issues.length > 0 && (
                <div>
                  <div style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colors.secondary,
                    textTransform: 'uppercase'
                  }}>
                    Issues
                  </div>
                  {results.issues.slice(0, 3).map(issue => (
                    <div
                      key={issue.id}
                      style={{
                        padding: spacing.md,
                        paddingLeft: spacing.lg,
                        color: colors.primary,
                        borderBottom: `1px solid ${colors.border}`,
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{issue.key}: {issue.title}</div>
                      <div style={{ fontSize: '11px', color: colors.secondary, marginTop: '2px' }}>
                        {issue.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.conversations.length === 0 && results.decisions.length === 0 && results.issues.length === 0 && (
                <div style={{ padding: spacing.lg, textAlign: 'center', color: colors.secondary }}>
                  No results found
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Search;
