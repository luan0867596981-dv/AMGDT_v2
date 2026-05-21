// Updated: 2026-05-19 - Global ErrorBoundary để bắt crash và tránh trắng trang
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#ef4444',
          fontFamily: 'system-ui, sans-serif',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️ Trang này gặp lỗi</h2>
          <p style={{ color: '#94a3b8', margin: '16px 0', fontSize: '14px', maxWidth: '500px' }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.href = '/';
            }}
            style={{
              padding: '10px 28px',
              background: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            ← Về trang chủ
          </button>
          {/* Show stack trace in dev mode */}
          {import.meta.env.DEV && this.state.error?.stack && (
            <pre style={{
              marginTop: '24px',
              textAlign: 'left',
              background: '#1e293b',
              color: '#f1f5f9',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '11px',
              overflow: 'auto',
              maxWidth: '800px',
              maxHeight: '300px',
              width: '100%',
            }}>
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
