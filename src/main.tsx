import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './style.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('venilearn_auth_session');
      sessionStorage.clear();
    } catch {}
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-app, #090d16)',
          color: 'var(--text-main, #f8fafc)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'var(--bg-surface, #1e293b)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Application Render Notice
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.875rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              A client-side error occurred while rendering this page:
            </p>
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              textAlign: 'left',
              wordBreak: 'break-word',
              marginBottom: '24px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '9px 18px',
                  background: 'var(--primary, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '9px 18px',
                  background: 'transparent',
                  color: 'var(--text-muted, #94a3b8)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))',
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
