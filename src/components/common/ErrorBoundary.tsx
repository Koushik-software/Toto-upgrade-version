import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TotoDrive ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('toto_active_ride');
      localStorage.removeItem('toto_route_cache');
    } catch {}
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-fallback" 
          className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 bg-[#FAF8F5] text-[#181818] rounded-2xl border border-amber-200/80 shadow-sm"
        >
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 ring-8 ring-amber-50">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#181818] text-center mb-1">
            {this.props.fallbackTitle || 'Something interrupted this view'}
          </h2>
          <p className="text-sm text-[#666666] text-center max-w-md mb-6 leading-relaxed">
            The application encountered a temporary layout issue. You can safely restore the screen without losing your profile.
          </p>

          {this.state.error?.message && (
            <div className="bg-amber-50/60 border border-amber-200 text-amber-900 text-xs font-mono p-3 rounded-xl max-w-md w-full mb-6 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="reload-view-btn"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B2C] hover:bg-[#E05316] text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4 animate-spin-reverse" />
              <span>Reload Screen</span>
            </button>

            <button
              id="reset-cache-btn"
              onClick={this.handleResetCache}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F0EDE6] text-[#181818] border border-[#DDD7CD] font-medium text-sm transition-all active:scale-95"
            >
              <Home className="w-4 h-4 text-[#888888]" />
              <span>Reset View Cache</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
