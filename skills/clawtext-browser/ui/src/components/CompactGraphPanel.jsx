/**
 * CompactGraphPanel
 * 
 * A dense, container-aware version of GraphPanel that:
 * - Fills 100% of available parent space (no fixed margins)
 * - Uses overlay controls (hover to show)
 * - Collapsible side panel (slide-in, not push)
 * - No legend (tooltip on first hover instead)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force';

const PROJECT_COLORS = {
  rgcs: '#f78166',
  ragefx: '#d2a8ff',
  clawtext: '#58a6ff',
  moltmud: '#3fb950',
  openclaw: '#e3b341',
  ingestion: '#f0883e',
  infrastructure: '#79c0ff',
  general: '#8b949e',
  default: '#58a6ff',
};

function projectColor(p) {
  return PROJECT_COLORS[p?.toLowerCase()] || PROJECT_COLORS.default;
}

function nodeRadius(memoryCount) {
  return Math.max(12, Math.min(30, 12 + (memoryCount || 0) * 0.5));
}

export default function CompactGraphPanel({ 
  api, 
  onSelectCluster, 
  selectedCluster,
  onNavigateToWalls 
}) {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [positions, setPositions] = useState({});
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [clusterDetail, setClusterDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  // Pan & zoom state
  const vtRef = useRef({ x: 0, y: 0, k: 1 });
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef(null);

  // d3 simulation refs
  const simRef = useRef(null);
  const nodeMapRef = useRef({});
  const dragNodeRef = useRef(null);
  const dragMovedRef = useRef(false);
  const shouldAutoFitRef = useRef(true);

  // ResizeObserver for container-aware sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Fetch graph data
  useEffect(() => {
    fetch(`${api}/api/graph`)
      .then(r => r.json())
      .then(data => {
        shouldAutoFitRef.current = true;
        setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [api]);

  // Fit to viewport
  const fitToViewport = useCallback((padding = 4) => {
    const vals = Object.values(nodeMapRef.current || {}).filter(
      n => Number.isFinite(n.x) && Number.isFinite(n.y)
    );
    if (!vals.length || !dims.width || !dims.height) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of vals) {
      const r = nodeRadius(n.memoryCount);
      minX = Math.min(minX, n.x - r);
      maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r);
      maxY = Math.max(maxY, n.y + r);
    }

    const graphW = Math.max(1, maxX - minX);
    const graphH = Math.max(1, maxY - minY);
    const targetW = Math.max(1, dims.width - padding * 2);
    const targetH = Math.max(1, dims.height - padding * 2);

    for (const n of vals) {
      const nx = graphW <= 1 ? 0.5 : (n.x - minX) / graphW;
      const ny = graphH <= 1 ? 0.5 : (n.y - minY) / graphH;
      n.x = padding + nx * targetW;
      n.y = padding + ny * targetH;
      n.vx = 0; n.vy = 0;
      if (n.fx != null) n.fx = n.x;
      if (n.fy != null) n.fy = n.y;
    }

    const pos = {};
    for (const n of vals) pos[n.id] = { x: n.x, y: n.y };
    setPositions(pos);

    vtRef.current = { x: 0, y: 0, k: 1 };
    setViewTransform({ x: 0, y: 0, k: 1 });
  }, [dims.width, dims.height]);

  // D3 simulation
  useEffect(() => {
    if (!graphData.nodes.length || !dims.width) return;

    if (simRef.current) simRef.current.stop();

    const { width, height } = dims;

    const d3Nodes = graphData.nodes.map(n => {
      const r = nodeRadius(n.memoryCount);
      const existing = nodeMapRef.current[n.id];
      return {
        ...n,
        r,
        x: existing?.x ?? (width / 2 + (Math.random() - 0.5) * width * 0.5),
        y: existing?.y ?? (height / 2 + (Math.random() - 0.5) * height * 0.5),
      };
    });

    const nodeById = Object.fromEntries(d3Nodes.map(n => [n.id, n]));
    nodeMapRef.current = nodeById;

    const d3Links = graphData.edges.map(e => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    const sim = forceSimulation(d3Nodes)
      .force('charge', forceManyBody()
        .strength(n => -Math.max(400, n.r * 50))
        .distanceMax(600)
        .distanceMin(30)
      )
      .force('link', forceLink(d3Links)
        .id(n => n.id)
        .distance(e => {
          if (e.type === 'negative') return 280;
          if (e.type === 'partial') return 220;
          const w = e.weight || 1;
          return Math.max(80, 180 - w * 15);
        })
        .strength(e => {
          if (e.type === 'negative') return 0.02;
          return Math.min(0.6, 0.2 + (e.weight || 1) * 0.04);
        })
      )
      .force('collide', forceCollide()
        .radius(n => n.r + 12)
        .strength(0.9)
        .iterations(3)
      )
      .force('center', forceCenter(width / 2, height / 2).strength(0.04))
      .alphaDecay(0.022)
      .velocityDecay(0.38);

    graphData.edges
      .filter(e => e.type === 'negative')
      .forEach(e => {
        sim.force(`wall-${e.id}`, forceManyBody().strength(-800));
      });

    sim.on('tick', () => {
      const densePad = 4;

      for (const n of d3Nodes) {
        const r = nodeRadius(n.memoryCount);
        const pad = r + 4;
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of d3Nodes) {
        const r = nodeRadius(n.memoryCount);
        minX = Math.min(minX, n.x - r);
        maxX = Math.max(maxX, n.x + r);
        minY = Math.min(minY, n.y - r);
        maxY = Math.max(maxY, n.y + r);
      }

      const graphW = Math.max(1, maxX - minX);
      const graphH = Math.max(1, maxY - minY);
      const targetW = Math.max(1, width - densePad * 2);
      const targetH = Math.max(1, height - densePad * 2);

      const pos = {};
      for (const n of d3Nodes) {
        const nx = graphW <= 1 ? 0.5 : (n.x - minX) / graphW;
        const ny = graphH <= 1 ? 0.5 : (n.y - minY) / graphH;
        n.x = densePad + nx * targetW;
        n.y = densePad + ny * targetH;
        if (n.fx != null) n.fx = n.x;
        if (n.fy != null) n.fy = n.y;
        pos[n.id] = { x: n.x, y: n.y };
      }

      setPositions(pos);
      for (const n of d3Nodes) nodeMapRef.current[n.id] = n;
    });

    sim.on('end', () => {
      if (shouldAutoFitRef.current) {
        shouldAutoFitRef.current = false;
        requestAnimationFrame(() => fitToViewport(4));
      }
    });

    if (shouldAutoFitRef.current) {
      setTimeout(() => {
        if (shouldAutoFitRef.current) {
          shouldAutoFitRef.current = false;
          fitToViewport(4);
        }
      }, 900);
    }

    simRef.current = sim;
    return () => sim.stop();
  }, [graphData, dims, fitToViewport]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.87 : 1.15;
    const newK = Math.max(0.15, Math.min(6, vtRef.current.k * factor));
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

  // Pan & drag handlers
  const handleSvgMouseDown = useCallback((e) => {
    if (dragNodeRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = { sx: e.clientX - vtRef.current.x, sy: e.clientY - vtRef.current.y };
  }, []);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    dragNodeRef.current = nodeId;
    dragMovedRef.current = false;
    const n = nodeMapRef.current[nodeId];
    if (n) { n.fx = n.x; n.fy = n.y; }
    if (simRef.current) simRef.current.alphaTarget(0.3).restart();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (isPanningRef.current && panStartRef.current) {
        vtRef.current = {
          ...vtRef.current,
          x: e.clientX - panStartRef.current.sx,
          y: e.clientY - panStartRef.current.sy,
        };
        setViewTransform({ ...vtRef.current });
      }
      if (dragNodeRef.current) {
        dragMovedRef.current = true;
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const gx = (e.clientX - rect.left - vtRef.current.x) / vtRef.current.k;
        const gy = (e.clientY - rect.top - vtRef.current.y) / vtRef.current.k;
        const n = nodeMapRef.current[dragNodeRef.current];
        if (n) { n.fx = gx; n.fy = gy; }
      }
    };

    const onUp = () => {
      if (dragNodeRef.current) {
        const n = nodeMapRef.current[dragNodeRef.current];
        if (n) { n.fx = null; n.fy = null; }
        if (simRef.current) simRef.current.alphaTarget(0).restart();
        dragNodeRef.current = null;
      }
      isPanningRef.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleNodeClick = useCallback(async (node) => {
    if (dragMovedRef.current) return;
    onSelectCluster(node);
    setShowDetail(true);
    try {
      const res = await fetch(`${api}/api/graph/node/${node.id}`);
      setClusterDetail(await res.json());
    } catch {}
  }, [api, onSelectCluster]);

  const handleRelayout = useCallback(() => {
    const { width, height } = dims;
    for (const n of Object.values(nodeMapRef.current)) {
      n.x = width / 2 + (Math.random() - 0.5) * width * 0.78;
      n.y = height / 2 + (Math.random() - 0.5) * height * 0.78;
      n.vx = 0; n.vy = 0;
      n.fx = null; n.fy = null;
    }
    shouldAutoFitRef.current = true;
    if (simRef.current) simRef.current.alpha(1).restart();
  }, [dims]);

  const zoomBy = useCallback((factor) => {
    const cx = dims.width / 2, cy = dims.height / 2;
    const newK = Math.max(0.15, Math.min(6, vtRef.current.k * factor));
    vtRef.current = {
      x: cx - (cx - vtRef.current.x) * (newK / vtRef.current.k),
      y: cy - (cy - vtRef.current.y) * (newK / vtRef.current.k),
      k: newK,
    };
    setViewTransform({ ...vtRef.current });
  }, [dims]);

  const edgeColor = (e) => {
    if (e.type === 'negative') return '#f85149';
    if (e.type === 'partial') return '#e3b341';
    const alpha = Math.min(0.7, 0.1 + (e.weight || 1) * 0.07);
    return `rgba(88,166,255,${alpha})`;
  };

  if (loading) return <div style={s.loading}>Loading…</div>;

  const { nodes, edges } = graphData;
  const { x: px, y: py, k: sk } = viewTransform;

  return (
    <div 
      style={s.root} 
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <svg 
        ref={svgRef} 
        width={dims.width} 
        height={dims.height}
        style={{ ...s.svg, cursor: isPanningRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleSvgMouseDown}
      >
        <g transform={`translate(${px},${py}) scale(${sk})`}>
          {/* Edges */}
          {edges.map(e => {
            const src = nodeMapRef.current[typeof e.source === 'object' ? e.source.id : e.source];
            const tgt = nodeMapRef.current[typeof e.target === 'object' ? e.target.id : e.target];
            if (!src || !tgt || src.x == null || tgt.x == null) return null;
            const meaningful = e.type === 'negative' || e.type === 'partial' || (e.weight || 0) > 1;
            const strokeW = (e.type === 'negative' || e.type === 'partial' ? 2 : Math.min(e.weight || 1, 3)) / sk;
            return (
              <g key={e.id || `${e.source}-${e.target}`}>
                <line 
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={edgeColor(e)} 
                  strokeWidth={strokeW}
                  strokeDasharray={e.type === 'negative' ? `${6/sk} ${3/sk}` : e.type === 'partial' ? `${3/sk} ${3/sk}` : undefined}
                  opacity={meaningful ? 0.9 : 0.18}
                  style={{ pointerEvents: 'stroke' }}
                  onMouseEnter={() => setTooltip({
                    x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2,
                    text: e.type === 'negative' ? `🧱 ${e.reason || 'Wall'}`
                      : e.type === 'partial' ? `⚠️ ${e.partialNote || e.reason || 'Partial'}`
                      : `Shared: ${(e.shared || []).slice(0, 3).join(', ')}`,
                  })}
                  onMouseLeave={() => setTooltip(null)}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const pos = positions[n.id];
            if (!pos) return null;
            const isSel = selectedCluster?.id === n.id;
            const isHov = hovered === n.id;
            const color = projectColor(n.project);
            const r = nodeRadius(n.memoryCount);
            const labelSize = Math.max(8, 10 / sk);

            return (
              <g 
                key={n.id} 
                transform={`translate(${pos.x},${pos.y})`}
                style={{ cursor: 'grab' }}
                onMouseDown={e => handleNodeMouseDown(e, n.id)}
                onClick={() => handleNodeClick(n)}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {(isSel || isHov) && (
                  <circle r={r + 6} fill={`${color}22`} stroke={color} strokeWidth={1/sk} />
                )}
                <circle 
                  r={r}
                  fill={`${color}30`}
                  stroke={isSel ? color : `${color}90`}
                  strokeWidth={isSel ? 2/sk : 1.2/sk}
                />
                <text 
                  textAnchor="middle" 
                  dy="0.35em"
                  fontSize={Math.max(8, 9/sk)} 
                  fontWeight="700" 
                  fill={color}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {n.memoryCount || 0}
                </text>
                {(isSel || isHov || sk > 1.2) && (
                  <text 
                    textAnchor="middle" 
                    dy={r + 12/sk}
                    fontSize={labelSize}
                    fill={isSel ? '#e6edf3' : '#8b949e'}
                    fontWeight={isSel ? '700' : '400'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {(n.label || n.id).slice(0, 18)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <foreignObject 
              x={tooltip.x + 6/sk} 
              y={tooltip.y - 14/sk} 
              width={180/sk} 
              height={48/sk}
              style={{ pointerEvents: 'none' }}
            >
              <div style={{ 
                background: '#21262d', 
                border: '1px solid #30363d', 
                borderRadius: 4,
                padding: '0.25rem 0.4rem', 
                color: '#c9d1d9', 
                fontSize: `${0.68/Math.max(0.4,sk)}rem`,
                lineHeight: 1.3, 
                wordBreak: 'break-word' 
              }}>
                {tooltip.text}
              </div>
            </foreignObject>
          )}
        </g>
      </svg>

      {/* Overlay Controls */}
      <div style={{
        ...s.controls,
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        <button style={s.btn} onClick={handleRelayout} title="Re-layout">⟳</button>
        <button style={s.btn} onClick={() => fitToViewport(4)} title="Fit">⤢</button>
        <button style={s.btn} onClick={() => zoomBy(1.3)} title="Zoom in">＋</button>
        <button style={s.btn} onClick={() => zoomBy(0.77)} title="Zoom out">－</button>
        <button style={s.btn} onClick={() => { vtRef.current={x:0,y:0,k:1}; setViewTransform({x:0,y:0,k:1}); }} title="Reset">⊙</button>
        <span style={s.zoomBadge}>{Math.round(sk * 100)}%</span>
      </div>

      {/* Collapsible Detail Panel */}
      {showDetail && clusterDetail && (
        <div style={s.detail}>
          <button style={s.closeBtn} onClick={() => { setShowDetail(false); setClusterDetail(null); }}>✕</button>
          <div style={s.detailHeader}>
            <span style={{ 
              fontSize: '0.68rem', 
              padding: '0.15rem 0.4rem', 
              borderRadius: 3, 
              fontWeight: 600,
              background: `${projectColor(clusterDetail.project)}22`, 
              color: projectColor(clusterDetail.project) 
            }}>
              {clusterDetail.project || 'general'}
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e6edf3' }}>
              {clusterDetail.topic || clusterDetail.id}
            </div>
            {clusterDetail.keywords?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginTop: '0.2rem' }}>
                {clusterDetail.keywords.slice(0, 6).map(k => (
                  <span key={k} style={{ 
                    fontSize: '0.65rem', 
                    background: '#21262d', 
                    color: '#8b949e', 
                    padding: '0.1rem 0.3rem', 
                    borderRadius: 3 
                  }}>
                    {k}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: '0.2rem' }}>
              {clusterDetail.memories?.length || 0} memories
            </div>
          </div>
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem',
            marginTop: '0.4rem'
          }}>
            {(clusterDetail.memories || []).slice(0, 15).map((m, i) => (
              <div key={i} style={{ 
                background: '#21262d', 
                borderRadius: 4, 
                padding: '0.35rem 0.5rem',
                fontSize: '0.72rem',
                lineHeight: 1.3
              }}>
                <div style={{ fontWeight: 600, color: '#c9d1d9', marginBottom: '0.15rem' }}>
                  {m.title || m.date || `Memory ${i+1}`}
                </div>
                <div style={{ color: '#8b949e' }}>
                  {(m.content || '').slice(0, 100)}…
                </div>
              </div>
            ))}
          </div>
          <button 
            style={s.wallBtn} 
            onClick={() => { setShowDetail(false); onNavigateToWalls(); }}
          >
            🧱 Manage Walls
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { 
    position: 'relative', 
    width: '100%', 
    height: '100%',
    overflow: 'hidden',
    background: '#0d1117',
  },
  svg: { display: 'block', userSelect: 'none' },
  loading: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%', 
    color: '#8b949e',
    fontSize: '0.85rem',
  },
  controls: {
    position: 'absolute', 
    top: '0.4rem', 
    right: '0.4rem',
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.15rem',
    background: '#161b22dd', 
    border: '1px solid #30363d', 
    borderRadius: 6,
    padding: '0.2rem 0.35rem', 
    backdropFilter: 'blur(8px)',
    transition: 'opacity 0.15s',
  },
  btn: { 
    background: 'transparent', 
    border: 'none', 
    color: '#c9d1d9', 
    cursor: 'pointer', 
    fontSize: '0.78rem', 
    padding: '2px 6px', 
    borderRadius: 3,
  },
  zoomBadge: {
    fontSize: '0.68rem',
    color: '#8b949e',
    marginLeft: '0.2rem',
    paddingLeft: '0.3rem',
    borderLeft: '1px solid #30363d',
  },
  detail: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '280px',
    background: '#161b22',
    borderLeft: '1px solid #30363d',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    zIndex: 10,
  },
  closeBtn: { 
    background: 'transparent', 
    border: 'none', 
    color: '#8b949e', 
    cursor: 'pointer', 
    fontSize: '0.9rem',
    alignSelf: 'flex-end',
  },
  detailHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  wallBtn: {
    marginTop: 'auto', 
    background: '#21262d', 
    border: '1px solid #f8514944',
    color: '#f85149', 
    borderRadius: 4, 
    padding: '0.35rem',
    cursor: 'pointer', 
    fontSize: '0.78rem', 
    fontWeight: 600,
  },
};
