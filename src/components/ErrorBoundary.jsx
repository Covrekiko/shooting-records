import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {import.meta.env.DEV && (
              <details className="text-left bg-secondary/30 p-4 rounded mb-6 text-xs max-h-32 overflow-auto">
                <summary className="cursor-pointer font-mono font-bold mb-2">Error Details</summary>
                <p className="font-mono text-destructive/80">{this.state.error?.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-destructive/60 whitespace-pre-wrap mt-2">
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}