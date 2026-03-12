/**
 * DenseStatusBar
 * 
 * A minimal, 1-line status bar that shows:
 * - Connection status
 * - Recent errors
 * - Provider latency (if available)
 * - Memory/hygiene stats
 * 
 * Designed for maximum density: no margins, minimal padding, single line.
 */

import React, { useState, useEffect } from 'react';

export default function DenseStatusBar({ api }) {
  const [stats, setStats] = useState({
    connected: false,
    clusters: 0,
    memories: 0,
    antiPatterns: 0,
    hygienePatterns: 0,
    lastError: null,
    providerLatency: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${api}/api/health`);
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          connected: true,
          clusters: data.clusters || 0,
          memories: data.memories || 0,
          antiPatterns: data.antiPatterns || 0,
          hygienePatterns: data.hygienePatterns || 0,
        }));
      } catch {
        setStats(prev => ({ ...prev, connected: false }));
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [api]);

  // Track recent errors (in-memory, resets on refresh)
  const [recentErrors, setRecentErrors] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.type === 'api-error') {
        setRecentErrors(prev => {
          const newErrors = [...prev, { 
            msg: e.detail.message, 
            time: Date.now() 
          }].slice(-3); // Keep last 3
          return newErrors;
        });
      }
    };
    window.addEventListener('clawtext-error', handler);
    return () => window.removeEventListener('clawtext-error', handler);
  }, []);

  const latestError = recentErrors[recentErrors.length - 1];
  const errorAge = latestError ? Math.floor((Date.now() - latestError.time) / 60000) : null;

  return (
    <div style={styles.root}>
      <span style={styles.item}>
        {stats.connected ? '✅' : '❌'} {stats.connected ? 'Connected' : 'Disconnected'}
      </span>
      
      <span style={styles.item}>
        🕸 {stats.clusters} clusters · {stats.memories} memories
      </span>
      
      <span style={styles.item}>
        🧱 {stats.antiPatterns} walls
      </span>
      
      <span style={styles.item}>
        🧹 {stats.hygienePatterns} patterns
      </span>
      
      {latestError && (
        <span style={{ ...styles.item, color: '#f85149' }}>
          ⚠️ Error {errorAge}m ago{errorAge > 0 ? 's' : ''}
        </span>
      )}
      
      {stats.providerLatency && (
        <span style={styles.item}>
          ⚡ {stats.providerLatency}ms
        </span>
      )}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.25rem 0.75rem',
    background: '#161b22',
    borderTop: '1px solid #30363d',
    fontSize: '0.72rem',
    color: '#8b949e',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 'none',
    height: '24px',
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
  },
};
