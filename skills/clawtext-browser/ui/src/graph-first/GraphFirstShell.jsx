import React from 'react';
import GraphPanel from '../components/GraphPanel.jsx';

export default function GraphFirstShell({
  api,
  mode,
  modes,
  setMode,
  selectedNode,
  setSelectedNode,
  drawerOpen,
  setDrawerOpen,
}) {
  const showGraph = mode === 'graph';

  return (
    <div style={styles.root}>
      <div style={styles.stage}>
        {showGraph ? (
          <GraphPanel
            api={api}
            selectedCluster={selectedNode}
            onSelectCluster={(node) => {
              setSelectedNode(node);
              setDrawerOpen(true);
            }}
            onNavigateToWalls={() => {
              setMode('walls');
              setDrawerOpen(true);
            }}
          />
        ) : (
          <div style={styles.placeholder}>
            <div style={styles.placeholderTitle}>{mode}</div>
            <div style={styles.placeholderText}>This mode will open as an overlay/drawer in the graph-first shell.</div>
          </div>
        )}
      </div>

      <div style={styles.topRail}>
        {modes.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            style={{
              ...styles.modePill,
              ...(mode === item.id ? styles.modePillActive : {}),
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.leftRail}>
        {modes.map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            title={item.label}
            style={{
              ...styles.railBtn,
              ...(mode === item.id ? styles.railBtnActive : {}),
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {drawerOpen && (
        <div style={styles.drawer}>
          <div style={styles.drawerHeader}>
            <div style={styles.drawerTitle}>
              {mode === 'graph' ? (selectedNode?.label || selectedNode?.id || 'Selection') : mode}
            </div>
            <button style={styles.closeBtn} onClick={() => setDrawerOpen(false)}>✕</button>
          </div>
          <div style={styles.drawerBody}>
            {mode === 'graph'
              ? 'Node detail drawer will live here. Default behavior is overlay, not canvas shrink.'
              : `${mode} tool drawer will live here.`}
          </div>
        </div>
      )}
    </div>
  );
}

const glass = {
  background: 'rgba(22, 27, 34, 0.78)',
  border: '1px solid rgba(48, 54, 61, 0.95)',
  backdropFilter: 'blur(10px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#0d1117',
  },
  stage: {
    position: 'absolute',
    inset: 0,
  },
  topRail: {
    position: 'absolute',
    top: 10,
    left: 58,
    display: 'flex',
    gap: 6,
    zIndex: 20,
  },
  modePill: {
    ...glass,
    color: '#8b949e',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    cursor: 'pointer',
  },
  modePillActive: {
    color: '#58a6ff',
    borderColor: 'rgba(88,166,255,0.7)',
  },
  leftRail: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    zIndex: 20,
  },
  railBtn: {
    ...glass,
    width: 40,
    height: 40,
    borderRadius: 10,
    color: '#8b949e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    cursor: 'pointer',
  },
  railBtnActive: {
    color: '#58a6ff',
    borderColor: 'rgba(88,166,255,0.7)',
  },
  drawer: {
    position: 'absolute',
    top: 10,
    right: 10,
    bottom: 10,
    width: 380,
    ...glass,
    borderRadius: 14,
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(48,54,61,0.95)',
  },
  drawerTitle: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: 700,
  },
  closeBtn: {
    background: 'transparent',
    color: '#8b949e',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  },
  drawerBody: {
    padding: 14,
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 1.5,
    overflow: 'auto',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b949e',
    gap: 8,
  },
  placeholderTitle: {
    color: '#e6edf3',
    fontWeight: 700,
    fontSize: 18,
    textTransform: 'capitalize',
  },
  placeholderText: {
    fontSize: 13,
  },
};
