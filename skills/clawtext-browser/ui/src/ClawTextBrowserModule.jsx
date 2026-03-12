import React, { useMemo, useState } from 'react';
import GraphFirstShell from './graph-first/GraphFirstShell.jsx';

const DEFAULT_MODES = [
  { id: 'graph', label: 'Graph', icon: '🕸' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'walls', label: 'Walls', icon: '🧱' },
  { id: 'hygiene', label: 'Hygiene', icon: '🧹' },
  { id: 'learnings', label: 'Learnings', icon: '🧠' },
];

export default function ClawTextBrowserModule({ api = '', initialMode = 'graph' }) {
  const [mode, setMode] = useState(initialMode);
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const modes = useMemo(() => DEFAULT_MODES, []);

  return (
    <div style={styles.root}>
      <GraphFirstShell
        api={api}
        mode={mode}
        modes={modes}
        setMode={setMode}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />
    </div>
  );
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    background: '#0d1117',
    color: '#c9d1d9',
  },
};
