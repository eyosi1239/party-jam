import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error UI to help identify which section crashed */
  section?: string;
  /** Optional fallback to render instead of the default error UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in its subtree and shows a recovery UI instead of
 * tearing down the whole page. Wrap each major section independently so a
 * crash in HostView doesn't kill GuestView, and vice versa.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` / ${this.props.section}` : ''}]`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const section = this.props.section ?? 'Something';

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950 p-6">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-red-400 text-5xl">!</div>
          <h2 className="text-white text-xl font-semibold">
            {section} ran into a problem
          </h2>
          <p className="text-white/50 text-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-sm transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
