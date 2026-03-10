import { useState, useEffect, useCallback, useRef } from 'react';

const PROJECT_COLORS = {
  rgcs: '#f78166',
  ragefx: '#d2a8ff',
  clawtext: '#58a6ff',
  moltmud: '#3fb950',
  openclaw: '#e3b341',
  general: '#8b949e',
  default: '#58a6ff',
};

function projectColor(p) {
  return PROJECT_COLORS[p?.toLowerCase()] || PROJECT_COLORS.default;
}

/**
 * Physics-based force layout — pure JS, no library dependency.
 * Nodes repel each other; edges attract connected pairs.
 */
function useForceLayout(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const posRef = useRef({});
  const velRef = useRef({});
  const animRef = useRef(null);

  useEffect(() => {
    if (!nodes.length) return;

    // Initialize positions on a circle
    const pos = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.min(width, height) * 0.32;
      pos[n.id] = {
        x: width / 2 + r * Math.cos(angle),
        y: height / 2 + r * Math.sin(angle),
      };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;

    let frame = 0;
    const tick = () => {
      const p = posRef.current;
      const v = velRef.current;
      const REPEL = 4000;
      const ATTRACT = 0.03;
      const DAMPING = 0.85;
      const CENTER_PULL = 0.002;

      for (const n of nodes) {
        let fx = 0, fy = 0;

        // Repulsion
        for (const m of nodes) {
          if (m.id === n.id) continue;
          const dx = p[n.id].x - p[m.id].x;
          const dy = p[n.id].y - p[m.id].y;
          const dist2 = dx * dx + dy * dy + 1;
          const force = REPEL / dist2;
          fx += (dx / Math.sqrt(dist2)) * force;
          fy += (dy / Math.sqrt(dist2)) * force;
        }

        // Attraction along positive edges
        for (const e of edges) {
          if (e.type === 'negative') continue;
          let other = null;
          if (e.source === n.id) other = e.target;
          else if (e.target === n.id) other = e.source;
          if (!other || !p[other]) continue;
          const dx = p[other].x - p[n.id].x;
          const dy = p[other].y - p[n.id].y;
          const w = e.type === 'partial' ? 0.01 : ATTRACT * (e.weight || 1);
          fx += dx * w;
          fy += dy * w;
        }

        // Gentle center pull
        fx += (width / 2 - p[n.id].x) * CENTER_PULL;
        fy += (height / 2 - p[n.id].y) * CENTER_PULL;

        v[n.id].x = (v[n.id].x + fx) * DAMPING;
        v[n.id].y = (v[n.id].y + fy) * DAMPING;
        p[n.id].x = Math.max(50, Math.min(width - 50, p[n.id].x + v[n.id].x));
        p[n.id].y = Math.max(50, Math.min(height - 50, p[n.id].y + v[n.id].y));
      }

      frame++;
      if (frame % 3 === 0) {
        setPositions({ ...posRef.current });
      }

      if (frame < 200) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, edges.length, width, height]);

  return positions;
}

export default function GraphPanel({ api, onSelectCluster, selectedCluster, onNavigateToWalls }) {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [clusterDetail, setClusterDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      setDims({ width: e.contentRect.width, height: e.contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    fetch(`${api}/api/graph`)
      .then(r => r.json())
      .then(data => { setGraphData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [api]);

  const positions = useForceLayout(graphData.nodes, graphData.edges, dims.width, dims.height);

  const handleNodeClick = useCallback(async (node) => {
    onSelectCluster(node);
    try {
      const res = await fetch(`${api}/api/graph/node/${node.id}`);
      const data = await res.json();
      setClusterDetail(data);
    } catch {}
  }, [api, onSelectCluster]);

  const edgeColor = (e) => {
    if (e.type === 'negative') return '#f85149';
    if (e.type === 'partial') return '#e3b341';
    const alpha = Math.min(0.8, 0.2 + (e.weight || 1) * 0.1);
    return `rgba(88, 166, 255, ${alpha})`;
  };

  if (loading) {
    return <div style={styles.loading}>Loading memory graph…</div>;
  }

  const { nodes, edges } = graphData;

  return (
    <div style={styles.root}>
      <div style={styles.canvas} ref={containerRef}>
        <svg width={dims.width} height={dims.height} style={styles.svg}>
          {/* Edges */}
          {edges.map(e => {
            const src = positions[e.source];
            const tgt = positions[e.target];
            if (!src || !tgt) return null;
            const isMeaningful = e.type === 'negative' || e.type === 'partial' || (e.weight || 0) > 1;
            return (
              <g key={e.id}>
                <line
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={edgeColor(e)}
                  strokeWidth={e.type === 'negative' || e.type === 'partial' ? 2 : Math.min(e.weight || 1, 3)}
                  strokeDasharray={e.type === 'negative' ? '6 3' : e.type === 'partial' ? '3 3' : undefined}
                  opacity={isMeaningful ? 1 : 0.3}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(ev) => setTooltip({
                    x: (src.x + tgt.x) / 2,
                    y: (src.y + tgt.y) / 2,
                    text: e.type === 'negative'
                      ? `🧱 Wall: ${e.reason}`
                      : e.type === 'partial'
                      ? `⚠️ Partial: ${e.partialNote || e.reason}`
                      : `Shared: ${(e.shared || []).slice(0, 4).join(', ')}`,
                  })}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* Wall indicator */}
                {(e.type === 'negative' || e.type === 'partial') && (
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 8}
                    textAnchor="middle"
                    fontSize="14"
                    style={{ userSelect: 'none' }}
                  >
                    {e.type === 'negative' ? '🧱' : '⚠️'}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const pos = positions[n.id];
            if (!pos) return null;
            const isSelected = selectedCluster?.id === n.id;
            const isHovered = hovered === n.id;
            const color = projectColor(n.project);
            const r = Math.min(28, 16 + (n.memoryCount || 0) * 0.8);

            return (
              <g
                key={n.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleNodeClick(n)}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow ring on hover/select */}
                {(isSelected || isHovered) && (
                  <circle r={r + 6} fill={`${color}22`} stroke={color} strokeWidth="1.5" />
                )}
                <circle
                  r={r}
                  fill={`${color}33`}
                  stroke={isSelected ? color : `${color}88`}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Memory count */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize="11"
                  fontWeight="700"
                  fill={color}
                >
                  {n.memoryCount || 0}
                </text>
                {/* Label below */}
                <text
                  textAnchor="middle"
                  dy={r + 14}
                  fontSize="11"
                  fill={isSelected || isHovered ? '#e6edf3' : '#8b949e'}
                  fontWeight={isSelected ? '700' : '400'}
                  style={{ userSelect: 'none' }}
                >
                  {(n.label || n.id).slice(0, 20)}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <foreignObject x={tooltip.x - 120} y={tooltip.y - 50} width="240" height="80">
              <div style={styles.tooltip}>{tooltip.text}</div>
            </foreignObject>
          )}
        </svg>

        {/* Legend */}
        <div style={styles.legend}>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#58a6ff' }} />Related</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#f85149' }} />Wall (negative)</div>
          <div style={styles.legendItem}><span style={{ ...styles.legendDot, background: '#e3b341' }} />Partial wall</div>
          <div style={{ ...styles.legendItem, marginTop: '0.25rem', color: '#8b949e', fontSize: '0.7rem' }}>
            Node size = memory count
          </div>
        </div>

        {/* Pending proposals badge */}
      </div>

      {/* Cluster detail panel */}
      {clusterDetail && (
        <div style={styles.detail}>
          <div style={styles.detailHeader}>
            <span style={{ ...styles.badge, background: `${projectColor(clusterDetail.project)}22`, color: projectColor(clusterDetail.project) }}>
              {clusterDetail.project || 'general'}
            </span>
            <button style={styles.closeBtn} onClick={() => { setClusterDetail(null); onSelectCluster(null); }}>✕</button>
          </div>
          <div style={styles.detailTitle}>{clusterDetail.topic || clusterDetail.id}</div>

          {clusterDetail.keywords?.length > 0 && (
            <div style={styles.tags}>
              {clusterDetail.keywords.slice(0, 8).map(k => (
                <span key={k} style={styles.tag}>{k}</span>
              ))}
            </div>
          )}

          <div style={styles.memCount}>{clusterDetail.memories?.length || 0} memories</div>

          <div style={styles.memList}>
            {(clusterDetail.memories || []).slice(0, 10).map((m, i) => (
              <div key={i} style={styles.memItem}>
                <div style={styles.memTitle}>{m.title || m.date || `Memory ${i + 1}`}</div>
                <div style={styles.memContent}>{(m.content || '').slice(0, 120)}…</div>
              </div>
            ))}
          </div>

          <button style={styles.wallBtn} onClick={onNavigateToWalls}>
            🧱 Manage Walls for this cluster
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', height: '100%', overflow: 'hidden' },
  canvas: { flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1117' },
  svg: { display: 'block' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e', fontSize: '0.9rem' },
  legend: {
    position: 'absolute',
    bottom: '1rem',
    left: '1rem',
    background: '#161b22cc',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '0.6rem 0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    backdropFilter: 'blur(8px)',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#c9d1d9' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  tooltip: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '0.4rem 0.6rem',
    fontSize: '0.75rem',
    color: '#c9d1d9',
    maxWidth: '240px',
    lineHeight: '1.4',
    backdropFilter: 'blur(4px)',
  },
  detail: {
    width: '320px',
    minWidth: '320px',
    background: '#161b22',
    borderLeft: '1px solid #30363d',
    padding: '1rem',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: '1rem', fontWeight: '700', color: '#e6edf3' },
  badge: { fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  tag: { fontSize: '0.7rem', background: '#21262d', color: '#8b949e', padding: '0.1rem 0.35rem', borderRadius: '4px' },
  memCount: { fontSize: '0.78rem', color: '#8b949e' },
  memList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto' },
  memItem: { background: '#21262d', borderRadius: '6px', padding: '0.5rem 0.65rem' },
  memTitle: { fontSize: '0.78rem', fontWeight: '600', color: '#c9d1d9', marginBottom: '0.2rem' },
  memContent: { fontSize: '0.74rem', color: '#8b949e', lineHeight: '1.4' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' },
  wallBtn: {
    marginTop: 'auto',
    background: '#21262d',
    border: '1px solid #f8514944',
    color: '#f85149',
    borderRadius: '6px',
    padding: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
};
