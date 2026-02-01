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
    <div style={{ minHeight: '100vh', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
              <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '20px' }}>R</span>
            </div>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>Recall</span>
          </div>
          
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>
            {isLogin ? 'Welcome back' : (inviteToken ? 'Join the team' : 'Get started')}
          </h1>
          <p style={{ fontSize: '14px', color: '#d1d5db' }}>
            {isLogin ? 'Sign in to your account' : (inviteToken ? 'Complete your registration' : 'Create your organization')}
          </p>
        </div>

        {/* Toggle */}
        {!inviteToken && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', backgroundColor: '#1a1a1a', padding: '4px', borderRadius: '4px' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              style={{ flex: 1, paddingTop: '12px', paddingBottom: '12px', fontWeight: 600, transition: 'all 0.2s', backgroundColor: isLogin ? '#374151' : 'transparent', color: isLogin ? '#ffffff' : '#9ca3af', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              style={{ flex: 1, paddingTop: '12px', paddingBottom: '12px', fontWeight: 600, transition: 'all 0.2s', backgroundColor: !isLogin ? '#374151' : 'transparent', color: !isLogin ? '#ffffff' : '#9ca3af', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              Sign up
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ backgroundColor: '#7f1d1d', border: '1px solid #dc2626', color: '#fca5a5', padding: '12px', fontSize: '14px', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          
          {!isLogin && !inviteToken && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                Organization Name
              </label>
              <input
                type="text"
                required
                style={{ width: '100%', paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: '#1a1a1a', border: '1px solid #374151', color: '#ffffff', fontSize: '14px', borderRadius: '4px', outline: 'none', transition: 'all 0.2s' }}
                placeholder="Acme Inc."
                value={credentials.organization}
                onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                onFocus={(e) => e.target.style.borderColor = '#4b5563'}
                onBlur={(e) => e.target.style.borderColor = '#374151'}
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              Email address
            </label>
            <input
              type="email"
              required
              disabled={!!inviteToken}
              style={{ width: '100%', paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: inviteToken ? '#0f0f0f' : '#1a1a1a', border: '1px solid #374151', color: '#ffffff', fontSize: '14px', borderRadius: '4px', outline: 'none', transition: 'all 0.2s', opacity: inviteToken ? 0.6 : 1 }}
              placeholder="you@company.com"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              onFocus={(e) => !inviteToken && (e.target.style.borderColor = '#4b5563')}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                style={{ width: '100%', paddingLeft: '12px', paddingRight: '40px', paddingTop: '10px', paddingBottom: '10px', backgroundColor: '#1a1a1a', border: '1px solid #374151', color: '#ffffff', fontSize: '14px', borderRadius: '4px', outline: 'none', transition: 'all 0.2s' }}
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                onFocus={(e) => e.target.style.borderColor = '#4b5563'}
                onBlur={(e) => e.target.style.borderColor = '#374151'}
              />
              <button
                type="button"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon style={{ width: '18px', height: '18px' }} />
                ) : (
                  <EyeIcon style={{ width: '18px', height: '18px' }} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: loading ? '#4b5563' : '#374151', color: '#ffffff', paddingTop: '12px', paddingBottom: '12px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', marginTop: '24px', opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#4b5563')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#374151')}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTop: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              <span>{isLogin ? 'Sign in' : (inviteToken ? 'Create account' : 'Create account')}</span>
            )}
          </button>
        </form>
        
        {isLogin && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)} style={{ color: '#ffffff', fontWeight: 600, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;
