/**
 * DenseDashboardApp
 * 
 * A container-aware, dashboard-integrated version of the ClawText browser.
 * - No 100vh assumptions — fills parent container
 * - Horizontal tab bar (for dashboard integration)
 * - Resizable multi-panel layout
 * - Dense status bar (1-line)
 * - All panels expand to fill available space
 */

import React, { useState } from 'react';
import DenseTabBar from '../DenseTabBar.jsx';
import DenseStatusBar from '../DenseStatusBar.jsx';
import CompactGraphPanel from './CompactGraphPanel.jsx';
import ResizablePanelContainer from './ResizablePanelContainer.jsx';

// Import other panels (will be updated to dense versions)
import SearchPanel from './SearchPanel.jsx';
import AntiPatternPanel from './AntiPatternPanel.jsx';
import LearningsPanel from './LearningsPanel.jsx';
import HygienePanel from './HygienePanel.jsx';

const TABS = [
  { id: 'graph',     label: 'Graph',    icon: '🕸' },
  { id: 'search',    label: 'Search',   icon: '🔍' },
  { id: 'walls',     label: 'Walls',    icon: '🧱' },
  { id: 'hygiene',   label: 'Hygiene',  icon: '🧹' },
  { id: 'learnings', label: 'Learnings',icon: '🧠' },
];

// Use empty string for relative URL (works in dashboard context)
const API = '';

export default function DenseDashboardApp() {
  const [activeTab, setActiveTab] = useState('graph');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [layoutSizes, setLayoutSizes] = useState([60, 40]); // Graph 60%, Panel 40%

  // Handle tab switching
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedCluster(null);
  };

  // Render active panel
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'graph':
        return (
          <CompactGraphPanel
            api={API}
            onSelectCluster={setSelectedCluster}
            selectedCluster={selectedCluster}
            onNavigateToWalls={() => setActiveTab('walls')}
          />
        );
      
      case 'search':
        return (
          <SearchPanel
            api={API}
            onSelectMemory={() => {}}
            selectedMemory={null}
          />
        );
      
      case 'walls':
        return <AntiPatternPanel api={API} />;
      
      case 'hygiene':
        return <HygienePanel api={API} />;
      
      case 'learnings':
        return <LearningsPanel api={API} />;
      
      default:
        return <CompactGraphPanel api={API} onSelectCluster={setSelectedCluster} selectedCluster={selectedCluster} onNavigateToWalls={() => setActiveTab('walls')} />;
    }
  };

  return (
    <div style={styles.root}>
      {/* Dense Tab Bar (for dashboard integration) */}
      <DenseTabBar 
        tabs={TABS} 
        activeTab={activeTab} 
        onChange={handleTabChange} 
      />

      {/* Main Content Area */}
      <div style={styles.content}>
        {activeTab === 'graph' ? (
          // Multi-panel layout for graph tab (graph + detail)
          <ResizablePanelContainer 
            defaultSizes={[70, 30]}
            persistKey="clawtext-graph-layout"
            minHeight={200}
            onLayoutChange={setLayoutSizes}
          >
            {/* Left: Graph Canvas (fills 70% by default) */}
            <CompactGraphPanel
              api={API}
              onSelectCluster={setSelectedCluster}
              selectedCluster={selectedCluster}
              onNavigateToWalls={() => setActiveTab('walls')}
            />
            
            {/* Right: Detail Panel (fills 30% by default) */}
            <div style={styles.panel}>
              {selectedCluster ? (
                // Show cluster detail if selected
                <div style={styles.panelContent}>
                  <div style={styles.panelHeader}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: 3, 
                      fontWeight: 600,
                      background: '#21262d', 
                      color: '#8b949e' 
                    }}>
                      {selectedCluster.project || 'general'}
                    </span>
                  </div>
                  <div style={styles.panelTitle}>
                    {selectedCluster.label || selectedCluster.id}
                  </div>
                  <div style={styles.panelMeta}>
                    {selectedCluster.memoryCount || 0} memories
                  </div>
                </div>
              ) : (
                <div style={styles.panelEmpty}>
                  Click a node to view details
                </div>
              )}
            </div>
          </ResizablePanelContainer>
        ) : (
          // Single panel for other tabs (fills 100%)
          <div style={styles.singlePanel}>
            {renderActivePanel()}
          </div>
        )}
      </div>

      {/* Dense Status Bar */}
      <DenseStatusBar api={API} />
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%', // Relative to parent container (not viewport)
    background: '#0d1117',
    color: '#c9d1d9',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5rem',
    background: '#161b22',
    borderLeft: '1px solid #30363d',
    overflow: 'hidden',
  },
  panelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  panelHeader: {
    display: 'flex',
    gap: '0.3rem',
    flexWrap: 'wrap',
  },
  panelTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#e6edf3',
    marginTop: '0.2rem',
  },
  panelMeta: {
    fontSize: '0.72rem',
    color: '#8b949e',
  },
  panelEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6e7681',
    fontSize: '0.85rem',
  },
  singlePanel: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
};
