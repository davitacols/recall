import { useState, useCallback } from 'react';

// Error Handler Utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          title: 'Invalid Request',
          message: data.error || data.detail || 'Please check your input and try again.',
          type: 'warning'
        };
      case 401:
        return {
          title: 'Authentication Required',
          message: 'Please log in to continue.',
          type: 'error',
          redirect: '/login'
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
          type: 'error'
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource could not be found.',
          type: 'warning'
        };
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'Please slow down and try again in a moment.',
          type: 'warning'
        };
      case 500:
      case 502:
      case 503:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again later.',
          type: 'error'
        };
      default:
        return {
          title: 'Error',
          message: data.error || data.detail || 'An unexpected error occurred.',
          type: 'error'
        };
    }
  } else if (error.request) {
    // Request made but no response
    return {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      type: 'error'
    };
  } else {
    // Something else happened
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred.',
      type: 'error'
    };
  }
};

// Toast Notification Hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};

// Form Validation Errors
export const getFieldError = (errors, fieldName) => {
  if (!errors || !errors[fieldName]) return null;
  
  const error = errors[fieldName];
  if (Array.isArray(error)) {
    return error[0];
  }
  return error;
};

// Retry Logic
export const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Error Boundary Fallback
export const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 uppercase">Something Went Wrong</h2>
        <p className="text-gray-600 mb-2">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Please try refreshing the page or contact support if the problem persists.
        </p>
        <div className="space-x-4">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold uppercase tracking-wide transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};
