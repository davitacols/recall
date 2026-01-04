import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import '../styles/auth.css';

function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const inviteEmail = searchParams.get('email');
  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [credentials, setCredentials] = useState({
    username: inviteEmail || '',
    password: '',
    token: inviteToken || '',
    organization: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      const result = await login(credentials);
      if (result.success) {
        addToast('Welcome back!', 'success');
        navigate('/');
      } else {
        setError(result.error);
        addToast(result.error, 'error');
      }
    } else {
      const result = await register(credentials);
      if (result.success) {
        setError('');
        if (inviteToken) {
          setIsLogin(true);
          setCredentials({ username: inviteEmail || '', password: '', token: '', organization: '' });
          addToast('Account created successfully! Please sign in.', 'success');
        } else {
          setIsLogin(true);
          setCredentials({ username: '', password: '', token: '', organization: '' });
          addToast('Organization created successfully! Please sign in.', 'success');
        }
      } else {
        setError(result.error);
        addToast(result.error, 'error');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-slate-700 flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">Recall</span>
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome back' : (inviteToken ? 'Join the team' : 'Get started')}
            </h1>
            <p className="text-lg text-slate-600">
              {isLogin ? 'Sign in to your account' : (inviteToken ? 'Complete your registration' : 'Create your organization')}
            </p>
          </div>

          {/* Toggle */}
          {!inviteToken && (
            <div className="flex gap-2 mb-8 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 font-medium transition-all ${
                  isLogin 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 font-medium transition-all ${
                  !isLogin 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 text-sm">
                {error}
              </div>
            )}
            
            {!isLogin && !inviteToken && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-slate-300 text-sm focus:border-slate-700 focus:ring-1 focus:ring-slate-700 focus:outline-none transition"
                  placeholder="Acme Inc."
                  value={credentials.organization}
                  onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                required
                disabled={!!inviteToken}
                className="w-full px-4 py-3 border border-slate-300 text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 focus:outline-none transition"
                placeholder="you@company.com"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-300 text-sm focus:border-slate-700 focus:ring-1 focus:ring-slate-700 focus:outline-none transition"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 px-4 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <span>{isLogin ? 'Sign in' : (inviteToken ? 'Create account' : 'Create account')}</span>
              )}
            </button>
          </form>
          
          {isLogin && (
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <button onClick={() => setIsLogin(false)} className="text-slate-700 font-semibold hover:text-slate-900">
                  Sign up
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white -ml-48 -mb-48"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-12 text-white text-center max-w-lg">
          <div className="mb-8 flex justify-center">
            <svg className="w-20 h-20 opacity-90 hero-icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Organize your team's knowledge
          </h2>
          
          <p className="text-xl text-slate-300 mb-12 leading-relaxed">
            Centralized platform for conversations, decisions, projects, and sprints. Keep everything searchable and accessible.
          </p>

          {/* Features */}
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-500 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Conversations & Decisions</h3>
                <p className="text-slate-300 text-sm">Capture context and rationale</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-500 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Projects & Sprints</h3>
                <p className="text-slate-300 text-sm">Plan and track work efficiently</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-6 h-6 bg-slate-500 flex items-center justify-center mt-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Search & Discover</h3>
                <p className="text-slate-300 text-sm">Find answers instantly across everything</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
