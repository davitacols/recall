import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:block lg:w-1/2 bg-gray-900 relative">
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white flex items-center justify-center">
              <span className="text-gray-900 font-bold text-2xl">R</span>
            </div>
            <span className="text-3xl font-bold">RECALL</span>
          </div>
          
          <div className="max-w-lg">
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              Transform conversations into knowledge
            </h1>
            <p className="text-2xl text-gray-300 leading-relaxed">
              AI-powered platform that turns team discussions into structured, searchable company memory.
            </p>
          </div>
          
          <div className="text-gray-400">
            © 2024 Recall. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-12">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">R</span>
              </div>
              <span className="text-3xl font-bold text-gray-900">RECALL</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              {isLogin ? 'Welcome back' : (inviteToken ? `You've been invited` : 'Get started')}
            </h2>
            <p className="text-xl text-gray-600">
              {isLogin ? 'Sign in to continue' : (inviteToken ? 'Complete your registration to join the team' : 'Create your organization')}
            </p>
          </div>

          {/* Toggle */}
          {!inviteToken && (
            <div className="flex mb-8 border border-gray-900">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 font-medium transition-all ${
                  isLogin 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 font-medium transition-all ${
                  !isLogin 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                Create org
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-600 text-white p-4">
                <div className="text-base">{error}</div>
              </div>
            )}
            
            {!isLogin && !inviteToken && (
              <div>
                <label className="block text-base font-bold text-gray-900 mb-3">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 text-base focus:border-gray-900 focus:outline-none"
                  placeholder="Acme Inc."
                  value={credentials.organization}
                  onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                />
              </div>
            )}
            
            <div>
              <label className="block text-base font-bold text-gray-900 mb-3">
                Email
              </label>
              <input
                type="email"
                required
                disabled={!!inviteToken}
                className="w-full px-4 py-3 border border-gray-300 text-base disabled:bg-gray-100 focus:border-gray-900 focus:outline-none"
                placeholder="you@company.com"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            
            <div className="relative">
              <label className="block text-base font-bold text-gray-900 mb-3">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 pr-12 border border-gray-300 text-base focus:border-gray-900 focus:outline-none"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
              <button
                type="button"
                className="absolute right-4 top-12"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-6 w-6 text-gray-400" />
                ) : (
                  <EyeIcon className="h-6 w-6 text-gray-400" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 px-4 text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                <span>{isLogin ? 'Sign in' : (inviteToken ? 'Create account' : 'Create account')}</span>
              )}
            </button>
          </form>
          
          {isLogin && (
            <div className="mt-8 text-center">
              <p className="text-base text-gray-600">
                New to Recall?{' '}
                <button onClick={() => setIsLogin(false)} className="text-gray-900 font-bold hover:underline">Create an account</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
