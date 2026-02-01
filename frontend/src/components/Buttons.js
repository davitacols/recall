import React from 'react';

export function PrimaryButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-10 py-4 rounded-full font-semibold text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white transition-all duration-300 hover:shadow-lg hover:shadow-blue-600/50 hover:scale-105 disabled:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function GlassButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-10 py-4 rounded-full font-semibold text-lg backdrop-blur-md bg-gradient-to-r from-cyan-500/25 to-cyan-600/25 border-2 border-cyan-500/50 text-white transition-all duration-300 hover:from-cyan-500/40 hover:to-cyan-600/40 hover:border-cyan-500 hover:scale-105 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-10 py-4 rounded-full font-semibold text-lg bg-gradient-to-r from-emerald-400/10 to-emerald-500/10 border-2 border-emerald-400/50 text-gray-900 transition-all duration-300 hover:from-emerald-400/20 hover:to-emerald-500/20 hover:border-emerald-400 ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-full bg-gradient-to-r from-blue-600/30 to-blue-700/30 text-white transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:scale-115 hover:rotate-5 ${className}`}
    >
      <Icon className="w-7 h-7" />
    </button>
  );
}

export function PillButton({ children, isActive, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-8 py-3 rounded-full font-medium transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white scale-108'
          : 'bg-transparent text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 hover:scale-108'
      } ${className}`}
    >
      {children}
    </button>
  );
}
