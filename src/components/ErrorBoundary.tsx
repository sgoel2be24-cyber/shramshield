/**
 * The last line of defence for a live demo.
 *
 * A React render error unmounts the whole tree and leaves a blank white page — which is exactly
 * what a stale build of this app did when the timing badge set state during render. The engine
 * is pure and tested, but a demo that fails in front of a judge should fail *legibly*: say what
 * happened, keep the disclaimer visible, and offer the two recoveries that actually work
 * (reload, or drop the shared-plan query string and start from defaults).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Nothing is sent anywhere — the console is the only sink, same as the rest of the app.
    console.error('ShramShield render error', error, info.componentStack);
  }

  render() {
    if (this.state.message === null) return this.props.children;

    return (
      <div className="app">
        <section className="panel error-panel" role="alert">
          <h2>The planner stopped rendering</h2>
          <p>
            Something in the page failed, so ShramShield has stopped rather than show a plan it cannot
            stand behind. The heat-safety engine runs entirely in this browser — no data was sent
            anywhere, and nothing was lost.
          </p>
          <p className="muted">Reported error: {this.state.message}</p>
          <div className="error-actions">
            <button type="button" onClick={() => window.location.reload()}>
              Reload the page
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                window.location.href = window.location.pathname;
              }}
            >
              Start from defaults
            </button>
          </div>
          <p className="muted">
            Advisory tool. It does not replace a site heat policy, a medical opinion, or local law.
          </p>
        </section>
      </div>
    );
  }
}
