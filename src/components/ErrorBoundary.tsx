import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  actionLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unexpected rendering error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="max-w-md w-full rounded-2xl border p-6 text-center space-y-4"
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderColor: 'var(--separator-hairline)',
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            <h2
              className="text-[17px] font-semibold"
              style={{ color: 'var(--label-primary)' }}
            >
              {this.props.title || 'Workspace view encountered an error'}
            </h2>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--label-secondary)' }}
            >
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white cursor-pointer"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{this.props.actionLabel || 'Recover View'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
