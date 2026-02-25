import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FILEHUB] Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Algo salió mal</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            {this.state.error?.message || 'Error inesperado en este módulo'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
