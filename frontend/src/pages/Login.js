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
    <div style={{ height: '100vh', backgroundColor: '#F4F5F7', fontFamily: 'Inter, system-ui, sans-serif', display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
      {/* Left Side - Branding */}
      <div style={{ backgroundColor: '#0052CC', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#ffffff', overflow: 'auto' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '64px' }}>
            <img src="/recalljpg.jpg" alt="RECALL" style={{ height: '32px', filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff' }}>RECALL</span>
          </button>
          <h1 style={{ fontSize: '48px', fontWeight: 700, lineHeight: '1.2', marginBottom: '24px' }}>
            Never lose a decision again
          </h1>
          <p style={{ fontSize: '20px', lineHeight: '1.6', color: '#DEEBFF', maxWidth: '500px' }}>
            Capture conversations, track decisions, and build institutional memory that preserves your team's knowledge forever.
          </p>
        </div>
        <div style={{ fontSize: '14px', color: '#DEEBFF' }}>
          © 2026 RECALL. All rights reserved.
        </div>
      </div>

      {/* Right Side - Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          {/* Title */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#172B4D', marginBottom: '8px' }}>
              {isLogin ? 'Welcome back' : (inviteToken ? 'Join the team' : 'Get started')}
            </h2>
            <p style={{ fontSize: '15px', color: '#6B778C' }}>
              {isLogin ? 'Sign in to continue to RECALL' : (inviteToken ? 'Complete your registration' : 'Create your organization')}
            </p>
          </div>

          {/* Form Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            {/* Toggle Buttons */}
            {!inviteToken && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  style={{ flex: 1, padding: '12px 24px', fontSize: '15px', fontWeight: 600, borderRadius: '6px', border: isLogin ? 'none' : '1px solid #DFE1E6', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: isLogin ? '#0052CC' : '#ffffff', color: isLogin ? '#ffffff' : '#6B778C' }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  style={{ flex: 1, padding: '12px 24px', fontSize: '15px', fontWeight: 600, borderRadius: '6px', border: !isLogin ? 'none' : '1px solid #DFE1E6', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: !isLogin ? '#0052CC' : '#ffffff', color: !isLogin ? '#ffffff' : '#6B778C' }}
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div style={{ backgroundColor: '#FFEBE6', border: '1px solid #FF5630', color: '#BF2600', padding: '12px', fontSize: '14px', borderRadius: '6px' }}>
                  {error}
                </div>
              )}

              {!isLogin && !inviteToken && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '10px 12px', backgroundColor: '#ffffff', border: '1px solid #DFE1E6', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
                    placeholder="Acme Inc."
                    value={credentials.organization}
                    onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                    onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                    onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  disabled={!!inviteToken}
                  style={{ width: '100%', padding: '10px 12px', backgroundColor: '#ffffff', border: '1px solid #DFE1E6', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border 0.2s', opacity: inviteToken ? 0.6 : 1 }}
                  placeholder="you@company.com"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  onFocus={(e) => !inviteToken && (e.target.style.borderColor = '#0052CC')}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', backgroundColor: '#ffffff', border: '1px solid #DFE1E6', color: '#172B4D', borderRadius: '6px', fontSize: '14px', outline: 'none', transition: 'border 0.2s' }}
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                    onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'transparent', border: 'none', color: '#6B778C', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> : <EyeIcon style={{ width: '20px', height: '20px' }} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: '8px', padding: '14px 24px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,82,204,0.2)' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0747A6')}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052CC'}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </div>
                ) : (
                  <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
              {isLogin && !inviteToken && (
                <p style={{ fontSize: '14px', color: '#6B778C' }}>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setIsLogin(false)} 
                    style={{ color: '#0052CC', fontWeight: 600, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Sign up
                  </button>
                </p>
              )}
              <button
                onClick={() => navigate('/')}
                style={{ fontSize: '14px', color: '#6B778C', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0052CC'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6B778C'}
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