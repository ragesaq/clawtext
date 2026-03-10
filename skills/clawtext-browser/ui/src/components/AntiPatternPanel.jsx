import { useState, useEffect } from 'react';

const STATUS_CONFIG = {
  confirmed: { label: '🧱 Confirmed Wall', color: '#f85149', bg: '#f8514922' },
  partial:   { label: '⚠️ Partial Wall',   color: '#e3b341', bg: '#e3b34122' },
  proposed:  { label: '🤔 Proposed',        color: '#8b949e', bg: '#8b949e22' },
  dismissed: { label: '✅ Dismissed',       color: '#3fb950', bg: '#3fb95022' },
};

export default function AntiPatternPanel({ api }) {
  const [patterns, setPatterns] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? `${api}/api/anti-patterns`
        : `${api}/api/anti-patterns?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setPatterns(data.patterns || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatterns(); }, [filter]);

  const propose = patterns.filter(p => p.status === 'proposed');

  const handleAction = async (id, action, body = {}) => {
    await fetch(`${api}/api/anti-patterns/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    fetchPatterns();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this wall permanently?')) return;
    await fetch(`${api}/api/anti-patterns/${id}`, { method: 'DELETE' });
    fetchPatterns();
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>🧱 Memory Walls</div>
          <div style={styles.subtitle}>Anti-patterns prevent false associations from contaminating agent context</div>
        </div>
        <button style={styles.createBtn} onClick={() => setShowCreate(true)}>
          + New Wall
        </button>
      </div>

      {/* Pending proposals banner */}
      {propose.length > 0 && (
        <div style={styles.proposalBanner}>
          <span>🤔 <b>{propose.length}</b> agent-proposed wall{propose.length > 1 ? 's' : ''} need your review</span>
          <button style={styles.bannerBtn} onClick={() => setFilter('proposed')}>Review</button>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filters}>
        {['all', 'confirmed', 'partial', 'proposed', 'dismissed'].map(f => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
            {f !== 'all' && (
              <span style={styles.filterCount}>
                {patterns.filter(p => p.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pattern list */}
      <div style={styles.list}>
        {loading && <div style={styles.empty}>Loading…</div>}
        {!loading && patterns.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧱</div>
            <div>No memory walls yet.</div>
            <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '0.25rem' }}>
              Walls prevent false associations between different domains.<br />
              Example: "RGCS smoothing" and "RageFX UI" are different — create a wall to keep them separate.
            </div>
            <button style={{ ...styles.createBtn, marginTop: '1rem' }} onClick={() => setShowCreate(true)}>
              + Create first wall
            </button>
          </div>
        )}

        {patterns
          .filter(p => filter === 'all' || p.status === filter)
          .map(p => (
            <PatternCard
              key={p.id}
              pattern={p}
              onConfirm={() => handleAction(p.id, 'confirm')}
              onPartial={(note) => handleAction(p.id, 'partial', { partialNote: note })}
              onDismiss={() => handleAction(p.id, 'dismiss')}
              onDelete={() => handleDelete(p.id)}
              onEdit={() => setEditTarget(p)}
            />
          ))
        }
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editTarget) && (
        <WallModal
          api={api}
          existing={editTarget}
          onClose={() => { setShowCreate(false); setEditTarget(null); }}
          onSave={() => { setShowCreate(false); setEditTarget(null); fetchPatterns(); }}
        />
      )}
    </div>
  );
}

function PatternCard({ pattern: p, onConfirm, onPartial, onDismiss, onDelete, onEdit }) {
  const [showPartialInput, setShowPartialInput] = useState(false);
  const [partialNote, setPartialNote] = useState(p.partialNote || '');
  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.proposed;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardEntities}>
          <span style={styles.entity}>{p.from}</span>
          <span style={styles.arrow}>↔</span>
          <span style={styles.entity}>{p.to}</span>
        </div>
        <div style={{ ...styles.statusBadge, background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </div>
      </div>

      {p.reason && (
        <div style={styles.reason}>{p.reason}</div>
      )}

      {p.partialNote && (
        <div style={styles.partialNote}>
          <span style={{ color: '#e3b341' }}>Shared: </span>{p.partialNote}
        </div>
      )}

      <div style={styles.cardMeta}>
        {p.agentProposed && <span style={styles.agentTag}>Agent-proposed</span>}
        <span style={styles.metaDate}>{p.createdAt?.slice(0, 10)}</span>
        {p.tags?.length > 0 && p.tags.map(t => (
          <span key={t} style={styles.tag}>{t}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {p.status === 'proposed' && (
          <>
            <button style={styles.btnConfirm} onClick={onConfirm}>✅ Confirm wall</button>
            <button style={styles.btnPartial} onClick={() => setShowPartialInput(true)}>⚠️ Partial</button>
            <button style={styles.btnDismiss} onClick={onDismiss}>✗ Not a wall</button>
          </>
        )}
        {(p.status === 'confirmed' || p.status === 'partial') && (
          <>
            <button style={styles.btnSmall} onClick={onEdit}>Edit</button>
            <button style={styles.btnDismiss} onClick={onDismiss}>Remove wall</button>
          </>
        )}
        {p.status === 'dismissed' && (
          <button style={styles.btnSmall} onClick={onConfirm}>Re-activate</button>
        )}
        <button style={styles.btnDelete} onClick={onDelete}>Delete</button>
      </div>

      {showPartialInput && (
        <div style={styles.partialForm}>
          <div style={styles.partialLabel}>What IS shared between these? (e.g. "QML patterns apply, but not smoothing")</div>
          <input
            style={styles.partialInput}
            value={partialNote}
            onChange={e => setPartialNote(e.target.value)}
            placeholder="Shared aspects (transfers); different aspects (do NOT)"
            autoFocus
          />
          <div style={styles.partialBtns}>
            <button style={styles.btnConfirm} onClick={() => { onPartial(partialNote); setShowPartialInput(false); }}>
              Save partial wall
            </button>
            <button style={styles.btnSmall} onClick={() => setShowPartialInput(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WallModal({ api, existing, onClose, onSave }) {
  const [from, setFrom] = useState(existing?.from || '');
  const [to, setTo] = useState(existing?.to || '');
  const [reason, setReason] = useState(existing?.reason || '');
  const [partialNote, setPartialNote] = useState(existing?.partialNote || '');
  const [type, setType] = useState(existing?.status === 'partial' ? 'partial' : 'confirmed');
  const [error, setError] = useState(null);

  const save = async () => {
    if (!from.trim() || !to.trim()) {
      setError('"From" and "To" are required');
      return;
    }

    if (existing) {
      await fetch(`${api}/api/anti-patterns/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, reason, partialNote: partialNote || null }),
      });
    } else {
      const res = await fetch(`${api}/api/anti-patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, reason, partialNote: partialNote || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
    }
    onSave();
  };

  return (
    <div style={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={{ fontWeight: '700', color: '#e6edf3' }}>
            {existing ? 'Edit Wall' : '🧱 Create Memory Wall'}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.hint}>
            A wall tells the memory system: "don't inject these two things together — they're different domains."
          </div>

          <label style={styles.label}>Entity / Topic A</label>
          <input style={styles.input} value={from} onChange={e => setFrom(e.target.value)} placeholder="e.g. RGCS.smoothing" />

          <label style={styles.label}>Entity / Topic B</label>
          <input style={styles.input} value={to} onChange={e => setTo(e.target.value)} placeholder="e.g. RageFX.ui" />

          <label style={styles.label}>Why are these different?</label>
          <textarea
            style={styles.textarea}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="RGCS smoothing is VR motion stabilization. RageFX UI is color grading overlay. Different domains."
            rows={3}
          />

          <label style={styles.label}>What IS shared? (optional — creates a partial wall)</label>
          <input
            style={styles.input}
            value={partialNote}
            onChange={e => setPartialNote(e.target.value)}
            placeholder="e.g. Both use QML — that pattern transfers. Smoothing concepts do NOT."
          />

          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.btnConfirm} onClick={save}>
            {existing ? 'Save changes' : 'Create wall'}
          </button>
          <button style={styles.btnSmall} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: {
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid #30363d',
    background: '#161b22',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: '1.1rem', fontWeight: '700', color: '#e6edf3', marginBottom: '0.2rem' },
  subtitle: { fontSize: '0.8rem', color: '#8b949e' },
  createBtn: {
    background: '#1f6feb',
    border: 'none',
    color: '#fff',
    borderRadius: '6px',
    padding: '0.4rem 0.9rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  proposalBanner: {
    background: '#161b2299',
    border: '1px solid #e3b34144',
    borderRadius: 0,
    padding: '0.6rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: '#e3b341',
  },
  bannerBtn: { background: '#e3b34122', border: '1px solid #e3b34144', color: '#e3b341', borderRadius: '5px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' },
  filters: {
    display: 'flex',
    gap: '0.4rem',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid #30363d',
    flexWrap: 'wrap',
  },
  filterBtn: {
    background: 'transparent',
    border: '1px solid #30363d',
    color: '#8b949e',
    borderRadius: '20px',
    padding: '0.2rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  filterBtnActive: { background: '#21262d', color: '#e6edf3', borderColor: '#58a6ff' },
  filterCount: { background: '#30363d', borderRadius: '10px', padding: '0 5px', fontSize: '0.7rem' },
  list: { flex: 1, overflow: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  empty: { textAlign: 'center', color: '#8b949e', fontSize: '0.85rem', padding: '3rem 2rem', margin: 'auto' },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  cardEntities: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  entity: {
    background: '#21262d',
    border: '1px solid #30363d',
    color: '#58a6ff',
    padding: '0.15rem 0.5rem',
    borderRadius: '5px',
    fontSize: '0.82rem',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  arrow: { color: '#8b949e', fontSize: '1rem' },
  statusBadge: { fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
  reason: { fontSize: '0.82rem', color: '#c9d1d9', lineHeight: '1.45' },
  partialNote: { fontSize: '0.8rem', color: '#8b949e', lineHeight: '1.4', background: '#e3b34111', padding: '0.4rem 0.6rem', borderRadius: '6px', borderLeft: '3px solid #e3b341' },
  cardMeta: { display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' },
  agentTag: { fontSize: '0.68rem', background: '#388bfd22', color: '#388bfd', padding: '0.1rem 0.4rem', borderRadius: '4px' },
  metaDate: { fontSize: '0.7rem', color: '#8b949e' },
  tag: { fontSize: '0.68rem', background: '#21262d', color: '#8b949e', padding: '0.1rem 0.35rem', borderRadius: '4px' },
  actions: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.25rem' },
  btnConfirm: { background: '#3fb95022', border: '1px solid #3fb95044', color: '#3fb950', borderRadius: '5px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' },
  btnPartial: { background: '#e3b34122', border: '1px solid #e3b34144', color: '#e3b341', borderRadius: '5px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' },
  btnDismiss: { background: '#f8514922', border: '1px solid #f8514944', color: '#f85149', borderRadius: '5px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600' },
  btnSmall: { background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: '5px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem' },
  btnDelete: { background: 'transparent', border: 'none', color: '#6e7681', padding: '0.25rem 0.4rem', cursor: 'pointer', fontSize: '0.75rem', marginLeft: 'auto' },
  partialForm: {
    background: '#21262d',
    border: '1px solid #e3b34144',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  partialLabel: { fontSize: '0.8rem', color: '#e3b341', fontWeight: '600' },
  partialInput: { background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '5px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', outline: 'none' },
  partialBtns: { display: 'flex', gap: '0.4rem' },
  modalOverlay: {
    position: 'fixed', inset: 0,
    background: '#00000088',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #30363d' },
  modalBody: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  modalFooter: { display: 'flex', gap: '0.5rem', padding: '1rem 1.25rem', borderTop: '1px solid #30363d' },
  hint: { fontSize: '0.8rem', color: '#8b949e', background: '#21262d', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.25rem' },
  label: { fontSize: '0.8rem', color: '#8b949e', fontWeight: '600' },
  input: { background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', outline: 'none' },
  textarea: { background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  error: { background: '#f8514922', border: '1px solid #f8514944', color: '#f85149', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.82rem' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' },
};
