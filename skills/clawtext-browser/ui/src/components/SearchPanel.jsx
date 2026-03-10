import { useState, useEffect, useRef } from 'react';

const PROJECT_COLORS = {
  rgcs: '#f78166',
  ragefx: '#d2a8ff',
  clawtext: '#58a6ff',
  moltmud: '#3fb950',
  openclaw: '#e3b341',
  default: '#8b949e',
};

export default function SearchPanel({ api, onSelectMemory, selectedMemory }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounce = useRef(null);

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/search?q=${encodeURIComponent(q)}&limit=50`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await fetch(`${api}/api/search/suggest?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSuggestions(data.suggestions || []);
  };

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      search(q);
      fetchSuggestions(q);
    }, 250);
  };

  const projectColor = (p) => PROJECT_COLORS[p?.toLowerCase()] || PROJECT_COLORS.default;

  return (
    <div style={styles.root}>
      {/* Search bar */}
      <div style={styles.header}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.input}
            placeholder="Search memories, entities, projects…"
            value={query}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            autoFocus
          />
          {loading && <span style={styles.spinner}>⟳</span>}
          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestions}>
              {suggestions.map(s => (
                <div
                  key={s}
                  style={styles.suggestion}
                  onMouseDown={() => { setQuery(s); search(s); setShowSuggestions(false); }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={styles.body}>
        {results.length === 0 && query && !loading && (
          <div style={styles.empty}>No memories found for "{query}"</div>
        )}
        {results.length === 0 && !query && (
          <div style={styles.emptyHint}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
            <div>Search across all memories, clusters, and projects</div>
            <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '0.25rem' }}>
              Try: "RGCS smoothing", "calibration", "QML", "operational learning"
            </div>
          </div>
        )}
        <div style={styles.list}>
          {results.map(r => (
            <div
              key={r.id || r.content?.slice(0, 20)}
              style={{
                ...styles.card,
                ...(selectedMemory?.id === r.id ? styles.cardSelected : {}),
              }}
              onClick={() => onSelectMemory(r)}
            >
              <div style={styles.cardTop}>
                <span style={{ ...styles.projectBadge, background: `${projectColor(r.project)}22`, color: projectColor(r.project) }}>
                  {r.project || 'general'}
                </span>
                <span style={styles.typeBadge}>{r.type || 'memory'}</span>
                <span style={styles.score}>{r.score}pts</span>
                {r.date && <span style={styles.date}>{r.date}</span>}
              </div>
              <div style={styles.cardTitle}>{r.title || r.clusterTopic || '(untitled)'}</div>
              <div style={styles.cardContent}>
                {(r.content || '').slice(0, 180)}{r.content?.length > 180 ? '…' : ''}
              </div>
              {r.entities?.length > 0 && (
                <div style={styles.tags}>
                  {r.entities.slice(0, 5).map(e => (
                    <span key={e} style={styles.tag}>{e}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedMemory && (
        <div style={styles.detail}>
          <div style={styles.detailHeader}>
            <span style={{ ...styles.projectBadge, background: `${projectColor(selectedMemory.project)}22`, color: projectColor(selectedMemory.project) }}>
              {selectedMemory.project}
            </span>
            <button style={styles.closeBtn} onClick={() => onSelectMemory(null)}>✕</button>
          </div>
          <div style={styles.detailTitle}>{selectedMemory.title || 'Memory Detail'}</div>
          <div style={styles.detailContent}>{selectedMemory.content}</div>
          <div style={styles.detailMeta}>
            <div><b>Cluster:</b> {selectedMemory.clusterTopic || selectedMemory.clusterId}</div>
            <div><b>Date:</b> {selectedMemory.date || '—'}</div>
            <div><b>Type:</b> {selectedMemory.type || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { padding: '1rem 1.25rem', borderBottom: '1px solid #30363d', background: '#161b22' },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    gap: '0.5rem',
  },
  searchIcon: { fontSize: '1rem', opacity: 0.6 },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e6edf3',
    fontSize: '0.9rem',
  },
  spinner: { animation: 'spin 1s linear infinite', fontSize: '1rem', color: '#58a6ff' },
  suggestions: {
    position: 'absolute',
    top: '110%',
    left: 0,
    right: 0,
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '8px',
    zIndex: 10,
    overflow: 'hidden',
  },
  suggestion: {
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#58a6ff',
    ':hover': { background: '#30363d' },
  },
  body: { flex: 1, overflow: 'auto', padding: '1rem 1.25rem', display: 'flex', gap: '1rem' },
  list: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  empty: { color: '#8b949e', fontSize: '0.85rem', padding: '2rem', textAlign: 'center' },
  emptyHint: { textAlign: 'center', color: '#8b949e', fontSize: '0.85rem', margin: 'auto', paddingTop: '4rem' },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '0.75rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  cardSelected: { borderColor: '#58a6ff' },
  cardTop: { display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' },
  projectBadge: { fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '600' },
  typeBadge: { fontSize: '0.68rem', color: '#8b949e', background: '#21262d', padding: '0.1rem 0.35rem', borderRadius: '4px' },
  score: { fontSize: '0.68rem', color: '#3fb950', marginLeft: 'auto' },
  date: { fontSize: '0.68rem', color: '#8b949e' },
  cardTitle: { fontSize: '0.85rem', fontWeight: '600', color: '#e6edf3', marginBottom: '0.25rem' },
  cardContent: { fontSize: '0.8rem', color: '#8b949e', lineHeight: '1.45' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' },
  tag: { fontSize: '0.68rem', background: '#21262d', color: '#8b949e', padding: '0.1rem 0.35rem', borderRadius: '4px' },
  detail: {
    width: '340px',
    minWidth: '340px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '1rem',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: 0,
    maxHeight: '100%',
    overflow: 'auto',
  },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  detailTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#e6edf3', marginBottom: '0.75rem' },
  detailContent: { fontSize: '0.82rem', color: '#c9d1d9', lineHeight: '1.55', whiteSpace: 'pre-wrap', marginBottom: '1rem' },
  detailMeta: { fontSize: '0.78rem', color: '#8b949e', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px solid #30363d', paddingTop: '0.75rem' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' },
};
