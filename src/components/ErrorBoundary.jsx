import { Component } from 'react';

/**
 * Top-level error boundary. Wraps the entire app so uncaught render errors
 * show a recovery UI instead of a blank screen.
 *
 * Uses data-testid="error-boundary" so Playwright smoke tests can detect crashes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] [ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary"
          className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-8"
        >
          <div className="max-w-lg w-full bg-rose-900/20 border border-rose-500/40 rounded-2xl p-8 text-center">
            <div className="text-rose-400 text-4xl mb-4">⚠</div>
            <h2 className="text-white font-black text-xl mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors mr-3"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
              Reload Page
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-6 text-left text-xs text-rose-300 bg-rose-950/50 rounded-lg p-4 overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
