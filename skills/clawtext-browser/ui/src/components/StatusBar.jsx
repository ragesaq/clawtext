import { useState, useEffect } from 'react';

export default function StatusBar({ api }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${api}/api/health`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, [api]);

  return (
    <div style={styles.bar}>
      {stats ? (
        <>
          <div style={styles.stat}>
            <span style={styles.num}>{stats.stats?.clusterCount ?? '—'}</span>
            <span style={styles.label}>clusters</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.num}>{stats.stats?.memoryCount ?? '—'}</span>
            <span style={styles.label}>memories</span>
          </div>
          <div style={styles.stat}>
            <span style={{ ...styles.num, color: '#f85149' }}>{stats.antiPatterns ?? 0}</span>
            <span style={styles.label}>walls</span>
          </div>
          <div style={{ ...styles.dot, background: '#3fb950' }} title="Connected" />
        </>
      ) : (
        <>
          <span style={{ fontSize: '0.7rem', color: '#8b949e' }}>Connecting...</span>
          <div style={{ ...styles.dot, background: '#f85149' }} />
        </>
      )}
    </div>
  );
}

const styles = {
  bar: {
    marginTop: 'auto',
    paddingTop: '1rem',
    borderTop: '1px solid #30363d',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    position: 'relative',
  },
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  num: { fontSize: '0.85rem', fontWeight: '700', color: '#58a6ff' },
  label: { fontSize: '0.72rem', color: '#8b949e' },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    position: 'absolute',
    top: '1.2rem',
    right: '0',
  },
};
