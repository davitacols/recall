import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="text-4xl font-black text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-8">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
