import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
  // When any value inside this array changes, the boundary will reset automatically
  resetKeys?: Array<unknown>;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (this.props.onError) this.props.onError(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset when resetKeys change
    const { resetKeys } = this.props;
    if (resetKeys && prevProps.resetKeys) {
      const changed =
        resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((k, i) => k !== prevProps.resetKeys![i]);
      if (changed && this.state.error) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (typeof fallback === "function") {
        return (
          fallback as (error: Error, reset: () => void) => React.ReactNode
        )(error, this.reset);
      }
      if (fallback) return fallback;

      // Default fallback UI
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="max-w-xl w-full border border-destructive/40 bg-destructive/10 text-destructive rounded p-4 shadow-sm">
            <div className="font-semibold mb-1">
              Something went wrong in this tab.
            </div>
            <div className="text-sm opacity-90 break-words mb-3">
              {error.message}
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded bg-foreground text-background hover:opacity-90"
                onClick={this.reset}
              >
                Reset tab
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded border border-foreground/40 hover:bg-foreground/5"
                onClick={() => window.location.reload()}
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
