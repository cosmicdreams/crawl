import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  /** The child content to render */
  children: ReactNode;
  /** Optional fallback component to render when an error occurs */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A generic error boundary component that catches JavaScript errors in its child tree.
 * It displays a fallback UI when an error occurs instead of crashing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#fff3f3',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          color: '#b71c1c'
        }}>
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}