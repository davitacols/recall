import React from 'react';

// Loading Spinner Component
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  };

  return (
    <div className={`${sizes[size]} border-gray-900 border-t-transparent rounded-full animate-spin ${className}`}></div>
  );
}

// Full Page Loading
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-6" />
        <p className="text-lg font-bold text-gray-900 uppercase tracking-wide">{message}</p>
      </div>
    </div>
  );
}

// Inline Loading
export function InlineLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" className="mr-3" />
      <span className="text-sm font-medium text-gray-600">{message}</span>
    </div>
  );
}

// Button Loading State
export function ButtonLoader() {
  return (
    <div className="flex items-center justify-center">
      <LoadingSpinner size="sm" className="mr-2" />
      <span>Processing...</span>
    </div>
  );
}

// Skeleton Loader for Cards
export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 p-6 animate-pulse">
      <div className="h-48 bg-gray-200 mb-4"></div>
      <div className="h-4 bg-gray-200 mb-3 w-3/4"></div>
      <div className="h-4 bg-gray-200 mb-3 w-full"></div>
      <div className="h-4 bg-gray-200 w-5/6"></div>
    </div>
  );
}

// Skeleton Loader for List Items
export function SkeletonListItem() {
  return (
    <div className="bg-white border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 mb-2 w-1/4"></div>
          <div className="h-4 bg-gray-200 mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

// Error Message Component
export function ErrorMessage({ 
  title = 'Something went wrong', 
  message = 'An unexpected error occurred. Please try again.',
  onRetry = null,
  type = 'error' // error, warning, info
}) {
  const styles = {
    error: 'bg-red-50 border-red-600 text-red-900',
    warning: 'bg-yellow-50 border-yellow-600 text-yellow-900',
    info: 'bg-blue-50 border-blue-600 text-blue-900'
  };

  return (
    <div className={`border-l-4 p-6 ${styles[type]}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {type === 'error' && (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'warning' && (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-1">{title}</h3>
          <p className="text-sm">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
export function EmptyState({ 
  icon: Icon,
  title, 
  message, 
  actionLabel = null,
  onAction = null 
}) {
  return (
    <div className="text-center py-16">
      {Icon && (
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 mb-6">
          <Icon className="w-10 h-10 text-gray-400" />
        </div>
      )}
      <h3 className="text-2xl font-bold text-gray-900 mb-4 uppercase">{title}</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-block px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold uppercase tracking-wide transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Toast Notification Component
export function Toast({ message, type = 'success', onClose }) {
  const styles = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600'
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose && onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 ${styles[type]} text-white px-6 py-4 shadow-lg z-50 max-w-md`}>
      <div className="flex items-center justify-between">
        <p className="font-bold uppercase tracking-wide text-sm">{message}</p>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Network Error Component
export function NetworkError({ onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 uppercase">Connection Lost</h2>
        <p className="text-gray-600 mb-8">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        <button
          onClick={onRetry}
          className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold uppercase tracking-wide transition-colors"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}
