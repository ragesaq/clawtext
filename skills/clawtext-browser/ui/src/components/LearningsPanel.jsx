/**
 * LearningsPanel.jsx
 * 
 * Operational learnings review + user resolution workflow.
 * 
 * The core problem: agent captures failures, but user often knows what fixed it.
 * This panel closes that loop — user searches failures, finds unresolved ones,
 * types in what actually worked, and marks it ready to promote.
 */

import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3737/api';

const STATUS_COLORS = {
  unresolved: '#f85149',
  resolved: '#3fb950',
  promoted: '#58a6ff',
  dismissed: '#6e7681'
};

const STATUS_LABELS = {
  unresolved: '⚠️ Unresolved',
  resolved: '✅ Resolved',
  promoted: '🚀 Promoted',
  dismissed: '🚫 Dismissed'
};

const SEVERITY_COLORS = {
  high: '#f85149',
  medium: '#e3b341',
  low: '#3fb950',
  unknown: '#6e7681'
};

function ResolutionForm({ learning, onResolved, onCancel }) {
  const [resolution, setResolution] = useState(learning.userResolution || '');
  const [readyToPromote, setReadyToPromote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!resolution.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/learnings/${learning.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, readyToPromote })
      });
      if (!resp.ok) throw new Error(await resp.text());
      onResolved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 8,
      padding: '1rem',
      marginTop: '0.5rem'
    }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ display: 'block', color: '#8b949e', fontSize: 12, marginBottom: 4 }}>
          What actually fixed this?
        </label>
        <textarea
          value={resolution}
          onChange={e => setResolution(e.target.value)}
          placeholder="Describe the real fix, workaround, or root cause discovery..."
          rows={4}
          autoFocus
          style={{
            width: '100%',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 6,
            color: '#c9d1d9',
            padding: '0.5rem',
            fontSize: 14,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '0.75rem' }}>
        <input
          type="checkbox"
          checked={readyToPromote}
          onChange={e => setReadyToPromote(e.target.checked)}
        />
        <span style={{ color: '#8b949e', fontSize: 13 }}>
          Mark as ready to promote to agent guidance
        </span>
      </label>

      {error && (
        <div style={{ color: '#f85149', fontSize: 13, marginBottom: '0.5rem' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={submitting || !resolution.trim()} style={{
          background: '#238636',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 16px',
          cursor: submitting ? 'wait' : 'pointer',
          fontSize: 13,
          opacity: submitting || !resolution.trim() ? 0.6 : 1
        }}>
          {submitting ? 'Saving...' : '✅ Save Resolution'}
        </button>
        <button type="button" onClick={onCancel} style={{
          background: 'transparent',
          color: '#8b949e',
          border: '1px solid #30363d',
          borderRadius: 6,
          padding: '6px 16px',
          cursor: 'pointer',
          fontSize: 13
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function LearningCard({ learning, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);

  const statusColor = STATUS_COLORS[learning.resolutionStatus] || '#6e7681';
  const severityColor = SEVERITY_COLORS[learning.severity] || '#6e7681';

  async function dismiss() {
    await fetch(`${API}/learnings/${learning.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' })
    });
    onUpdated();
  }

  return (
    <div style={{
      background: '#161b22',
      border: `1px solid ${expanded ? '#58a6ff44' : '#30363d'}`,
      borderRadius: 8,
      marginBottom: '0.5rem',
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer'
        }}
      >
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor, marginTop: 6, flexShrink: 0
        }} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#c9d1d9', fontSize: 14, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap'
          }}>
            {learning.problem}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
            {learning.context && (
              <span style={{ fontSize: 11, color: '#58a6ff', background: '#58a6ff1a', padding: '1px 6px', borderRadius: 4 }}>
                {learning.context}
              </span>
            )}
            <span style={{ fontSize: 11, color: severityColor, background: `${severityColor}1a`, padding: '1px 6px', borderRadius: 4 }}>
              {learning.severity}
            </span>
            <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}1a`, padding: '1px 6px', borderRadius: 4 }}>
              {STATUS_LABELS[learning.resolutionStatus] || learning.resolutionStatus}
            </span>
            {learning.tags?.map(tag => (
              <span key={tag} style={{ fontSize: 11, color: '#8b949e', background: '#8b949e1a', padding: '1px 6px', borderRadius: 4 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div style={{ color: '#6e7681', fontSize: 11, flexShrink: 0, marginTop: 2 }}>
          {new Date(learning.timestamp).toLocaleDateString()}
        </div>

        {/* Chevron */}
        <div style={{ color: '#6e7681', fontSize: 12, flexShrink: 0, marginTop: 2 }}>
          {expanded ? '▾' : '▸'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid #21262d' }}>
          {/* Agent analysis */}
          {learning.agentAnalysis && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                🤖 Agent Analysis
              </div>
              <div style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.5, background: '#0d1117', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                {learning.agentAnalysis}
              </div>
            </div>
          )}

          {/* Agent proposed fix */}
          {learning.agentProposedFix && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                🔧 Agent Proposed Fix
              </div>
              <div style={{ color: '#e3b341', fontSize: 13, lineHeight: 1.5, background: '#e3b3411a', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #e3b34133' }}>
                {learning.agentProposedFix}
              </div>
            </div>
          )}

          {/* User resolution (if exists) */}
          {learning.userResolution && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ color: '#8b949e', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                ✅ Your Resolution
                <span style={{ color: '#6e7681', fontWeight: 400, textTransform: 'none', marginLeft: 8 }}>
                  {new Date(learning.userResolutionAt).toLocaleString()}
                </span>
              </div>
              <div style={{ color: '#3fb950', fontSize: 13, lineHeight: 1.5, background: '#3fb9501a', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #3fb95033' }}>
                {learning.userResolution}
              </div>
            </div>
          )}

          {/* Resolve form */}
          {resolving && (
            <ResolutionForm
              learning={learning}
              onResolved={() => { setResolving(false); onUpdated(); }}
              onCancel={() => setResolving(false)}
            />
          )}

          {/* Action buttons */}
          {!resolving && (
            <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
              {learning.resolutionStatus !== 'dismissed' && learning.resolutionStatus !== 'promoted' && (
                <button onClick={() => setResolving(true)} style={{
                  background: learning.userResolution ? '#0d419d' : '#238636',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontSize: 12
                }}>
                  {learning.userResolution ? '✏️ Edit Resolution' : '✅ Add Resolution'}
                </button>
              )}
              {learning.resolutionStatus === 'unresolved' && (
                <button onClick={dismiss} style={{
                  background: 'transparent',
                  color: '#8b949e',
                  border: '1px solid #30363d',
                  borderRadius: 6,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  fontSize: 12
                }}>
                  🚫 Dismiss
                </button>
              )}
              {learning.resolutionStatus === 'resolved' && !learning.promotedTo && (
                <span style={{ color: '#3fb950', fontSize: 12, alignSelf: 'center' }}>
                  Ready to promote → agent will pick this up
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearningsPanel() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('unresolved'); // unresolved | resolved | promoted | all
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/learnings/stats`);
      setStats(await resp.json());
    } catch {}
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query });
      if (filter !== 'all') params.append('resolutionStatus', filter);
      const resp = await fetch(`${API}/learnings?${params}`);
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, filter]);

  useEffect(() => {
    loadStats();
    search();
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [query]);

  function handleUpdated() {
    loadStats();
    search();
  }

  const filterTabs = [
    { key: 'unresolved', label: `⚠️ Unresolved`, count: stats?.unresolved },
    { key: 'resolved', label: `✅ Resolved`, count: stats?.resolved },
    { key: 'promoted', label: `🚀 Promoted`, count: stats?.promoted },
    { key: 'all', label: `All`, count: stats?.total }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, color: '#c9d1d9', fontSize: 16 }}>
            🧠 Learnings Review
          </h2>
          {stats?.readyToPromote > 0 && (
            <span style={{
              background: '#1f6feb33',
              color: '#58a6ff',
              border: '1px solid #1f6feb',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 12
            }}>
              {stats.readyToPromote} ready to promote
            </span>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search failures, context, tags..."
          style={{
            width: '100%',
            background: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: 6,
            color: '#c9d1d9',
            padding: '6px 10px',
            fontSize: 14,
            boxSizing: 'border-box',
            marginBottom: '0.75rem'
          }}
        />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                background: filter === tab.key ? '#21262d' : 'transparent',
                color: filter === tab.key ? '#c9d1d9' : '#8b949e',
                border: filter === tab.key ? '1px solid #30363d' : '1px solid transparent',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {tab.label}
              {tab.count != null && (
                <span style={{
                  background: '#30363d',
                  borderRadius: 10,
                  padding: '0 5px',
                  fontSize: 11,
                  color: '#8b949e'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {error && (
          <div style={{ color: '#f85149', background: '#f851491a', border: '1px solid #f8514933', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem' }}>
            {error.includes('operational') || error.includes('ENOENT') ? (
              <>
                <strong>No operational learnings found.</strong><br />
                <span style={{ fontSize: 13 }}>
                  Start capturing failures via ClawText operational learning lane.
                  Files go in <code>memory/operational/candidates/</code>
                </span>
              </>
            ) : error}
          </div>
        )}

        {!error && !loading && results.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6e7681', padding: '2rem 0' }}>
            {filter === 'unresolved'
              ? '✅ No unresolved learnings — all caught up!'
              : 'No learnings match your search.'}
          </div>
        )}

        {results.map(learning => (
          <LearningCard
            key={learning.id}
            learning={learning}
            onUpdated={handleUpdated}
          />
        ))}

        {loading && (
          <div style={{ textAlign: 'center', color: '#6e7681', padding: '2rem 0' }}>
            Loading...
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid #21262d',
        color: '#6e7681',
        fontSize: 11,
        flexShrink: 0
      }}>
        Resolved learnings with "ready to promote" → agent picks up via{' '}
        <code style={{ color: '#8b949e' }}>GET /api/learnings/export/promote-ready</code>
      </div>
    </div>
  );
}
