import React from 'react';

function Button({ 
  children, 
  loading = false, 
  disabled = false, 
  variant = 'primary', 
  type = 'button',
  onClick,
  className = ''
}) {
  const baseStyles = 'px-4 py-2 font-medium transition-colors inline-flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-400',
    secondary: 'border border-gray-900 text-gray-900 hover:bg-gray-50 disabled:border-gray-400 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

export default Button;
