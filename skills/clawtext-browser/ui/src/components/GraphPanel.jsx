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

function useForceLayout(nodes, edges, width, height) {
  const posRef = useRef({});
  const velRef = useRef({});
  const animRef = useRef(null);
  const frozenRef = useRef(new Set());
  const [positions, setPositions] = useState({});

  const initPositions = useCallback(() => {
    if (!nodes.length || !width || !height) return;
    const pos = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = Math.min(width, height) * 0.32;
      pos[n.id] = {
        x: width / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 60,
        y: height / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 60,
      };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;
  }, [nodes, width, height]);

  const startSimulation = useCallback((maxFrames = 500) => {
    cancelAnimationFrame(animRef.current);
    let frame = 0;
    const REPEL = 14000;
    const ATTRACT = 0.03;
    const WALL_REPEL = 10000;
    const DAMPING = 0.78;
    const CENTER_PULL = 0.0015;

    const tick = () => {
      const p = posRef.current;
      const v = velRef.current;

      for (const n of nodes) {
        if (frozenRef.current.has(n.id) || !p[n.id]) continue;
        let fx = 0, fy = 0;

        // Repulsion between all nodes
        for (const m of nodes) {
          if (m.id === n.id || !p[m.id]) continue;
          const dx = p[n.id].x - p[m.id].x;
          const dy = p[n.id].y - p[m.id].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const clamped = Math.max(dist, 90);
          const force = REPEL / (clamped * clamped);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        // Edge forces
        for (const e of edges) {
          let other = null;
          if (e.source === n.id) other = e.target;
          else if (e.target === n.id) other = e.source;
          if (!other || !p[other]) continue;
          const dx = p[other].x - p[n.id].x;
          const dy = p[other].y - p[n.id].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          if (e.type === 'negative') {
            const force = WALL_REPEL / (dist * dist);
            fx -= (dx / dist) * force;
            fy -= (dy / dist) * force;
          } else {
            const w = e.type === 'partial' ? 0.006 : ATTRACT * Math.max(1, e.weight || 1);
            fx += dx * w;
            fy += dy * w;
          }
        }

        // Gentle center pull
        fx += (width / 2 - p[n.id].x) * CENTER_PULL;
        fy += (height / 2 - p[n.id].y) * CENTER_PULL;

        if (!v[n.id]) v[n.id] = { x: 0, y: 0 };
        v[n.id].x = (v[n.id].x + fx) * DAMPING;
        v[n.id].y = (v[n.id].y + fy) * DAMPING;
        p[n.id].x = Math.max(60, Math.min(width - 60, p[n.id].x + v[n.id].x));
        p[n.id].y = Math.max(60, Math.min(height - 60, p[n.id].y + v[n.id].y));
      }

      frame++;
      if (frame % 2 === 0) setPositions({ ...p });
      if (frame < maxFrames) animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  }, [nodes, edges, width, height]);

  useEffect(() => {
    if (!nodes.length || !width || !height) return;
    initPositions();
    startSimulation(500);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, edges.length, width, height]);

  return { positions, posRef, velRef, frozenRef, startSimulation, initPositions };
}

export default function GraphPanel({ api, onSelectCluster, selectedCluster, onNavigateToWalls }) {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [clusterDetail, setClusterDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });

  // Pan & zoom
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, k: 1 });
  const vtRef = useRef({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef(null);

  // Node drag
  const [dragPositions, setDragPositions] = useState({});
  const isDraggingNodeRef = useRef(false);
  const dragNodeIdRef = useRef(null);
  const dragMovedRef = useRef(false);

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

  const { positions, posRef, velRef, frozenRef, startSimulation, initPositions } = useForceLayout(
    graphData.nodes, graphData.edges, dims.width, dims.height
  );

  // Merge sim positions with live drag positions
  const displayPositions = { ...positions, ...dragPositions };

  // Wheel zoom centered on cursor
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.87 : 1.15;
    const newK = Math.max(0.2, Math.min(5, vtRef.current.k * factor));
    const newX = mx - (mx - vtRef.current.x) * (newK / vtRef.current.k);
    const newY = my - (my - vtRef.current.y) * (newK / vtRef.current.k);
    vtRef.current = { x: newX, y: newY, k: newK };
    setViewTransform({ ...vtRef.current });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Background mousedown → start pan
  const handleSvgMouseDown = useCallback((e) => {
    if (isDraggingNodeRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = {
      sx: e.clientX - vtRef.current.x,
      sy: e.clientY - vtRef.current.y,
    };
  }, []);

  // Node mousedown → start drag
  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    isDraggingNodeRef.current = true;
    dragMovedRef.current = false;
    dragNodeIdRef.current = nodeId;
    frozenRef.current.add(nodeId);
  }, [frozenRef]);

  // Global move + up
  useEffect(() => {
    const onMove = (e) => {
      if (isPanningRef.current && panStartRef.current) {
        const newX = e.clientX - panStartRef.current.sx;
        const newY = e.clientY - panStartRef.current.sy;
        vtRef.current = { ...vtRef.current, x: newX, y: newY };
        setViewTransform({ ...vtRef.current });
      }
      if (isDraggingNodeRef.current && dragNodeIdRef.current) {
        dragMovedRef.current = true;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const gx = (e.clientX - rect.left - vtRef.current.x) / vtRef.current.k;
        const gy = (e.clientY - rect.top - vtRef.current.y) / vtRef.current.k;
        posRef.current[dragNodeIdRef.current] = { x: gx, y: gy };
        const id = dragNodeIdRef.current;
        setDragPositions(prev => ({ ...prev, [id]: { x: gx, y: gy } }));
      }
    };

    const onUp = () => {
      if (isDraggingNodeRef.current && dragNodeIdRef.current) {
        frozenRef.current.delete(dragNodeIdRef.current);
        if (velRef.current[dragNodeIdRef.current]) {
          velRef.current[dragNodeIdRef.current] = { x: 0, y: 0 };
        }
        setDragPositions({});
        isDraggingNodeRef.current = false;
        dragNodeIdRef.current = null;
        startSimulation(120);
      }
      isPanningRef.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [posRef, velRef, frozenRef, startSimulation]);

  const handleNodeClick = useCallback(async (node) => {
    if (dragMovedRef.current) return; // was a drag, not a click
    onSelectCluster(node);
    try {
      const res = await fetch(`${api}/api/graph/node/${node.id}`);
      const data = await res.json();
      setClusterDetail(data);
    } catch {}
  }, [api, onSelectCluster]);

  const handleRelayout = useCallback(() => {
    initPositions();
    startSimulation(600);
    vtRef.current = { x: 0, y: 0, k: 1 };
    setViewTransform({ x: 0, y: 0, k: 1 });
  }, [initPositions, startSimulation]);

  const zoomBy = useCallback((factor) => {
    const newK = Math.max(0.2, Math.min(5, vtRef.current.k * factor));
    // Zoom toward center of viewport
    const cx = dims.width / 2, cy = dims.height / 2;
    const newX = cx - (cx - vtRef.current.x) * (newK / vtRef.current.k);
    const newY = cy - (cy - vtRef.current.y) * (newK / vtRef.current.k);
    vtRef.current = { x: newX, y: newY, k: newK };
    setViewTransform({ ...vtRef.current });
  }, [dims]);

  const resetView = useCallback(() => {
    vtRef.current = { x: 0, y: 0, k: 1 };
    setViewTransform({ x: 0, y: 0, k: 1 });
  }, []);

  const edgeColor = (e) => {
    if (e.type === 'negative') return '#f85149';
    if (e.type === 'partial') return '#e3b341';
    const alpha = Math.min(0.75, 0.12 + (e.weight || 1) * 0.08);
    return `rgba(88,166,255,${alpha})`;
  };

  if (loading) return <div style={styles.loading}>Loading memory graph…</div>;

  const { nodes, edges } = graphData;
  const { x: px, y: py, k: sk } = viewTransform;
  // Scale-compensated sizes so labels are readable at any zoom
  const fs = 11 / sk;
  const sw = 1.5 / sk;

  return (
    <div style={styles.root}>
      <div style={styles.canvas} ref={containerRef}>
        <svg
          ref={svgRef}
          width={dims.width}
          height={dims.height}
          style={{ ...styles.svg, cursor: isPanningRef.current ? 'grabbing' : 'grab' }}
          onMouseDown={handleSvgMouseDown}
        >
          <g transform={`translate(${px},${py}) scale(${sk})`}>
            {/* Edges */}
            {edges.map(e => {
              const src = displayPositions[e.source];
              const tgt = displayPositions[e.target];
              if (!src || !tgt) return null;
              const meaningful = e.type === 'negative' || e.type === 'partial' || (e.weight || 0) > 1;
              return (
                <g key={e.id}>
                  <line
                    x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={edgeColor(e)}
                    strokeWidth={e.type === 'negative' || e.type === 'partial' ? 2 / sk : Math.min((e.weight || 1), 3) / sk}
                    strokeDasharray={e.type === 'negative' ? `${6/sk} ${3/sk}` : e.type === 'partial' ? `${3/sk} ${3/sk}` : undefined}
                    opacity={meaningful ? 1 : 0.2}
                    style={{ cursor: 'default', pointerEvents: 'stroke' }}
                    onMouseEnter={() => setTooltip({
                      x: (src.x + tgt.x) / 2,
                      y: (src.y + tgt.y) / 2,
                      text: e.type === 'negative' ? `🧱 Wall: ${e.reason}`
                        : e.type === 'partial' ? `⚠️ Partial: ${e.partialNote || e.reason}`
                        : `Shared: ${(e.shared || []).slice(0, 4).join(', ')}`,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  {(e.type === 'negative' || e.type === 'partial') && (
                    <text x={(src.x+tgt.x)/2} y={(src.y+tgt.y)/2 - 12/sk}
                      textAnchor="middle" fontSize={13/sk}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {e.type === 'negative' ? '🧱' : '⚠️'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const pos = displayPositions[n.id];
              if (!pos) return null;
              const isSel = selectedCluster?.id === n.id;
              const isHov = hovered === n.id;
              const color = projectColor(n.project);
              const r = Math.min(30, 14 + (n.memoryCount || 0) * 0.75);

              return (
                <g key={n.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: 'grab' }}
                  onMouseDown={e => handleNodeMouseDown(e, n.id)}
                  onClick={() => handleNodeClick(n)}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {(isSel || isHov) && (
                    <circle r={r + 7} fill={`${color}1a`} stroke={color} strokeWidth={sw} />
                  )}
                  <circle r={r}
                    fill={`${color}2e`}
                    stroke={isSel ? color : `${color}80`}
                    strokeWidth={isSel ? 2.5/sk : sw}
                  />
                  <text textAnchor="middle" dy="0.35em" fontSize={fs} fontWeight="700" fill={color}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {n.memoryCount || 0}
                  </text>
                  <text textAnchor="middle" dy={r + 14/sk} fontSize={fs}
                    fill={isSel || isHov ? '#e6edf3' : '#8b949e'}
                    fontWeight={isSel ? '700' : '400'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {(n.label || n.id).slice(0, 22)}
                  </text>
                </g>
              );
            })}

            {/* Edge tooltip */}
            {tooltip && (
              <foreignObject x={tooltip.x + 8/sk} y={tooltip.y - 16/sk}
                width={200/sk} height={64/sk} style={{ pointerEvents: 'none' }}>
                <div style={{ ...styles.tooltip, fontSize: `${0.72/Math.max(0.5,sk)}rem` }}>
                  {tooltip.text}
                </div>
              </foreignObject>
            )}
          </g>
        </svg>

        {/* Controls */}
        <div style={styles.controls}>
          <button onClick={handleRelayout} style={styles.controlBtn} title="Re-randomize and re-settle layout">⟳ Re-layout</button>
          <div style={styles.divider} />
          <button onClick={() => zoomBy(1.3)} style={styles.controlBtn} title="Zoom in">＋</button>
          <button onClick={() => zoomBy(0.77)} style={styles.controlBtn} title="Zoom out">－</button>
          <button onClick={resetView} style={styles.controlBtn} title="Reset zoom/pan">⊙</button>
        </div>

        {/* Zoom indicator */}
        <div style={styles.zoomBadge}>{Math.round(sk * 100)}%</div>

        {/* Legend */}
        <div style={styles.legend}>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#58a6ff' }} />Related</div>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#f85149' }} />Wall</div>
          <div style={styles.legendItem}><span style={{ ...styles.dot, background: '#e3b341' }} />Partial</div>
          <div style={styles.hint}>Scroll to zoom · Drag bg to pan · Drag nodes to arrange</div>
        </div>
      </div>

      {/* Cluster detail */}
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
              {clusterDetail.keywords.slice(0, 8).map(k => <span key={k} style={styles.tag}>{k}</span>)}
            </div>
          )}
          <div style={styles.memCount}>{clusterDetail.memories?.length || 0} memories</div>
          <div style={styles.memList}>
            {(clusterDetail.memories || []).slice(0, 10).map((m, i) => (
              <div key={i} style={styles.memItem}>
                <div style={styles.memTitle}>{m.title || m.date || `Memory ${i+1}`}</div>
                <div style={styles.memBody}>{(m.content || '').slice(0, 120)}…</div>
              </div>
            ))}
          </div>
          <button style={styles.wallBtn} onClick={onNavigateToWalls}>🧱 Manage Walls</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', height: '100%', overflow: 'hidden' },
  canvas: { flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1117' },
  svg: { display: 'block', userSelect: 'none' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e' },
  controls: {
    position: 'absolute', top: '0.75rem', right: '0.75rem',
    display: 'flex', alignItems: 'center', gap: '0.2rem',
    background: '#161b22dd', border: '1px solid #30363d',
    borderRadius: '8px', padding: '0.35rem 0.5rem',
    backdropFilter: 'blur(8px)',
  },
  controlBtn: {
    background: 'transparent', border: 'none', color: '#c9d1d9',
    cursor: 'pointer', fontSize: '0.82rem', padding: '3px 8px',
    borderRadius: '4px', transition: 'background 0.1s',
  },
  divider: { width: 1, height: 16, background: '#30363d', margin: '0 2px' },
  zoomBadge: {
    position: 'absolute', top: '0.75rem', left: '0.75rem',
    background: '#161b22dd', border: '1px solid #30363d',
    borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem',
    color: '#8b949e', backdropFilter: 'blur(8px)',
  },
  legend: {
    position: 'absolute', bottom: '1rem', left: '1rem',
    background: '#161b22dd', border: '1px solid #30363d',
    borderRadius: '8px', padding: '0.5rem 0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    backdropFilter: 'blur(8px)',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#c9d1d9' },
  dot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  hint: { fontSize: '0.65rem', color: '#6e7681', marginTop: 2 },
  tooltip: {
    background: '#21262d', border: '1px solid #30363d', borderRadius: '6px',
    padding: '0.3rem 0.5rem', color: '#c9d1d9', lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  detail: {
    width: '300px', minWidth: '300px', background: '#161b22',
    borderLeft: '1px solid #30363d', padding: '1rem',
    overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem',
  },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: '1rem', fontWeight: '700', color: '#e6edf3' },
  badge: { fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: '600' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  tag: { fontSize: '0.7rem', background: '#21262d', color: '#8b949e', padding: '0.1rem 0.35rem', borderRadius: '4px' },
  memCount: { fontSize: '0.78rem', color: '#8b949e' },
  memList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' },
  memItem: { background: '#21262d', borderRadius: '6px', padding: '0.5rem 0.65rem' },
  memTitle: { fontSize: '0.78rem', fontWeight: '600', color: '#c9d1d9', marginBottom: '0.2rem' },
  memBody: { fontSize: '0.74rem', color: '#8b949e', lineHeight: 1.4 },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' },
  wallBtn: {
    marginTop: 'auto', background: '#21262d', border: '1px solid #f8514944',
    color: '#f85149', borderRadius: '6px', padding: '0.5rem',
    cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
  },
};
