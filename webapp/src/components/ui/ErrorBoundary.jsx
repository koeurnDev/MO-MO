import React from 'react';

/**
 * MO-MO Principal Error Boundary (v1)
 * Strategy: Component-Level Fault Tolerance & Telemetry Logging
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // 📊 Log to Telemetry or Console for Principal monitoring
    console.error('🔥 UI CRASH CAUGHT:', error, errorInfo);
    
    if (window.telemetry && typeof window.telemetry.capture === 'function') {
      window.telemetry.capture('UI_CRASH', {
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.text}>
              The app encountered an unexpected error. Don't worry, your cart is safe.
            </p>
            <button 
              onClick={this.handleRetry}
              style={styles.button}
            >
              Retry
            </button>
            <div style={styles.footer}>
              Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    background: 'var(--bg-app, #f8f9fa)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif'
  },
  card: {
    background: 'var(--bg-surface, white)',
    borderRadius: '24px',
    padding: '40px 20px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    maxWidth: '400px',
    width: '100%',
    border: '1px solid rgba(0,0,0,0.05)'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    color: 'var(--text-bold, #222)',
    margin: '0 0 10px 0'
  },
  text: {
    fontSize: '16px',
    color: 'var(--text-muted, #666)',
    lineHeight: '1.5',
    margin: '0 0 30px 0'
  },
  button: {
    background: 'var(--primary-accent, #007bff)',
    color: 'white',
    border: 'none',
    padding: '14px 40px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  footer: {
    marginTop: '30px',
    fontSize: '12px',
    color: 'var(--text-muted, #999)',
    opacity: 0.6
  }
};

export default ErrorBoundary;
