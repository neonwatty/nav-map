import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class NavMapErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '24px',
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: 8,
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>Something went wrong rendering NavMap.</strong>
          <p style={{ margin: '8px 0 0', opacity: 0.8 }}>{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
