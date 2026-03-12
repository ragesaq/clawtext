import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: '#1a1a2e',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <details style={{ marginTop: '1rem', color: '#8b949e' }}>
            <summary>Stack trace</summary>
            <pre style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
