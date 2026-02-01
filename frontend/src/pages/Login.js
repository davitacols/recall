import React, { useState } from 'react';
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
    <div className="min-h-screen w-full bg-stone-950">
      {/* Header */}
      <header className="border-b border-amber-700 px-6 lg:px-12 py-4 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/recalljpg.jpg" alt="RECALL" className="h-8" />
            <span className="text-xl font-bold text-white">RECALL</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 lg:px-12 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              {isLogin ? 'Welcome back' : (inviteToken ? 'Join the team' : 'Get started')}
            </h1>
            <p className="text-xl text-amber-100">
              {isLogin ? 'Sign in to your account' : (inviteToken ? 'Complete your registration' : 'Create your organization')}
            </p>
          </div>

          {/* Form Card */}
          <div className="border border-amber-700 rounded-2xl p-8 lg:p-12 backdrop-blur-sm">
            {/* Toggle Buttons */}
            {!inviteToken && (
              <div className="flex gap-2 mb-8 bg-stone-900 p-1 rounded-lg border border-amber-700">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition ${
                    isLogin ? 'bg-amber-700 text-white' : 'text-amber-100 hover:text-white'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-md transition ${
                    !isLogin ? 'bg-amber-700 text-white' : 'text-amber-100 hover:text-white'
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {!isLogin && !inviteToken && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-stone-900 border border-amber-700 text-white placeholder-amber-100 rounded-lg focus:outline-none focus:border-amber-600 transition"
                    placeholder="Acme Inc."
                    value={credentials.organization}
                    onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  disabled={!!inviteToken}
                  className={`w-full px-4 py-3 bg-stone-900 border border-amber-700 text-white placeholder-amber-100 rounded-lg focus:outline-none focus:border-amber-600 transition ${
                    inviteToken ? 'opacity-60' : ''
                  }`}
                  placeholder="you@company.com"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full px-4 py-3 pr-12 bg-stone-900 border border-amber-700 text-white placeholder-amber-100 rounded-lg focus:outline-none focus:border-amber-600 transition"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-100 hover:text-white transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-8 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-full font-semibold transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 space-y-4 text-center">
              {isLogin && !inviteToken && (
                <p className="text-sm text-amber-100">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setIsLogin(false)} 
                    className="text-white font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
              <button
                onClick={() => navigate('/')}
                className="text-sm text-amber-100 hover:text-white transition"
              >
                ← Back to homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
