import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[NagarMitra ErrorBoundary caught error]:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12 text-center">
          <div className="max-w-md w-full rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle size={28} />
            </div>

            <h1 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">
              Something unexpected happened
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              NagarMitra encountered an issue while loading this section. You can reload the page or return to the main dashboard.
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-24 overflow-y-auto rounded-xl bg-slate-50 p-3 text-left font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} variant="primary" className="flex items-center justify-center gap-2">
                <RotateCcw size={16} />
                Reload page
              </Button>
              <Button onClick={this.handleHome} variant="secondary" className="flex items-center justify-center gap-2">
                <Home size={16} />
                Back to home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
