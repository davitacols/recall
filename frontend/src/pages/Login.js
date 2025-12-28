import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isLogin) {
      const result = await login(credentials);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } else {
      const result = await register(credentials);
      if (result.success) {
        setError('');
        setIsLogin(true);
        setCredentials({ username: '', password: '', token: '', organization: '' });
        alert('Account created successfully! Please sign in.');
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80" 
          alt="Team collaboration"
          className="absolute inset-0 w-full h-full object-cover animate-[zoom_20s_ease-in-out_infinite]" 
        />
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Floating 3D Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 backdrop-blur-sm rounded-lg animate-[float_6s_ease-in-out_infinite] transform rotate-12"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-full animate-[float_8s_ease-in-out_infinite_2s]"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-pink-500/20 backdrop-blur-sm rounded-lg animate-[float_7s_ease-in-out_infinite_1s] transform -rotate-12"></div>
        
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-white">
          <div className="flex items-center space-x-3 animate-[slideDown_0.6s_ease-out]">
            <div className="w-10 h-10 bg-white flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-all duration-300">
              <span className="text-blue-600 font-bold text-xl">R</span>
            </div>
            <span className="text-2xl font-semibold">Recall</span>
          </div>
          
          <div className="max-w-lg animate-[slideUp_0.8s_ease-out]">
            <h1 className="text-5xl font-bold mb-6 leading-tight animate-[fadeIn_1s_ease-out]">
              Transform conversations into knowledge
            </h1>
            <p className="text-xl text-blue-50 leading-relaxed animate-[fadeIn_1.2s_ease-out]">
              AI-powered platform that turns team discussions into structured, searchable company memory.
            </p>
          </div>
          
          <div className="text-sm text-blue-100">
            © 2024 Recall. All rights reserved.
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md animate-[fadeIn_0.8s_ease-out]">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center space-x-3 animate-[slideDown_0.6s_ease-out]">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-all duration-300">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">Recall</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8 animate-[slideUp_0.6s_ease-out]">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : (inviteToken ? 'Join your team' : 'Get started')}
            </h2>
            <p className="text-base text-gray-600">
              {isLogin ? 'Sign in to your workspace' : (inviteToken ? 'Complete your registration' : 'Create your organization')}
            </p>
          </div>

          {/* Toggle */}
          {!inviteToken && (
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1 animate-[slideUp_0.7s_ease-out]">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-300 ${
                  isLogin 
                    ? 'bg-white text-gray-900 shadow-sm transform scale-105' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-300 ${
                  !isLogin 
                    ? 'bg-white text-gray-900 shadow-sm transform scale-105' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Create org
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 animate-[slideUp_0.8s_ease-out]">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-[shake_0.5s_ease-in-out]">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}
            
            {!isLogin && !inviteToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Acme Inc."
                  value={credentials.organization}
                  onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                  className="transition-all duration-300 focus:scale-[1.02]"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                disabled={!!inviteToken}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base disabled:bg-gray-100"
                placeholder="you@company.com"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="transition-all duration-300 focus:scale-[1.02]"
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="transition-all duration-300 focus:scale-[1.02]"
              />
              <button
                type="button"
                className="absolute right-4 top-11"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-base font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating...'}
                </div>
              ) : (
                <span>{isLogin ? 'Sign in' : (inviteToken ? 'Complete registration' : 'Create organization')}</span>
              )}
            </button>
          </form>
          
          {isLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need access?{' '}
                <span className="text-blue-600 font-medium">Contact your admin</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
