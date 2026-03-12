/**
 * DenseTabBar
 * 
 * A compact, horizontal tab bar for dashboard integration.
 * - Minimal height (32px)
 * - No margins/padding waste
 * - Active tab highlighted
 * - Click to switch
 */

import React from 'react';

export default function DenseTabBar({ tabs, activeTab, onChange }) {
  return (
    <div style={styles.root}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          style={{
            ...styles.tab,
            ...(activeTab === tab.id ? styles.tabActive : {}),
          }}
          onClick={() => onChange(tab.id)}
        >
          <span style={styles.tabIcon}>{tab.icon}</span>
          <span style={styles.tabLabel}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    flex: 'none',
    height: '32px',
    padding: '0 0.25rem',
    gap: '0.1rem',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.6rem',
    background: 'transparent',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    fontSize: '0.78rem',
    borderRadius: '4px 4px 0 0',
    transition: 'all 0.15s',
    minHeight: '32px',
  },
  tabActive: {
    background: '#0d1117',
    color: '#58a6ff',
    fontWeight: '600',
    borderBottom: '2px solid #58a6ff',
  },
  tabIcon: {
    fontSize: '0.85rem',
  },
  tabLabel: {
    whiteSpace: 'nowrap',
  },
};
