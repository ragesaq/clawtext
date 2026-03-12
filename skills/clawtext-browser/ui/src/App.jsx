import React from 'react';
import ClawTextBrowserModule from './ClawTextBrowserModule.jsx';

export default function App() {
  return (
    <div style={styles.root}>
      <ClawTextBrowserModule api="" initialMode="graph" />
    </div>
  );
}

const styles = {
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#0d1117',
  },
};
