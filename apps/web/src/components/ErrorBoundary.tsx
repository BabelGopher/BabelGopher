import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from './ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Prevents entire app from crashing when a component error occurs
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleGoHome = (): void => {
    // Navigate to home page
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-300 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-900 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-gray-400 font-mono break-all">
                  {this.state.error.stack}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="secondary"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2"
              >
                Try Again
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                Go Home
              </Button>
            </div>

            <p className="text-gray-500 text-sm mt-6">
              If this problem persists, please refresh the page or check your browser console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
