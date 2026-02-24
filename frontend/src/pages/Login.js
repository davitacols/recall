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
        window.location.href = '/';
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <button onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '24px' }}>
            <img src="/recalljpg.jpg" alt="Knowledgr" style={{ height: '40px' }} />
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#172b4d' }}>Knowledgr</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 500, color: '#172b4d', marginBottom: '8px' }}>
            {isLogin ? 'Log in to your account' : (inviteToken ? 'Join your team' : 'Sign up for your account')}
          </h1>
        </div>

        {/* Form Card */}
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #dfe1e6', borderRadius: '3px', padding: '32px', boxShadow: '0 0 0 1px rgba(9,30,66,0.08)' }}>
          {/* Toggle */}
          {!inviteToken && (
            <div style={{ display: 'flex', gap: '0', marginBottom: '24px', border: '2px solid #dfe1e6', borderRadius: '3px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  border: 'none', 
                  cursor: 'pointer', 
                  backgroundColor: isLogin ? '#0052cc' : '#ffffff', 
                  color: isLogin ? '#ffffff' : '#42526e',
                  transition: 'all 0.1s'
                }}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  border: 'none', 
                  cursor: 'pointer', 
                  backgroundColor: !isLogin ? '#0052cc' : '#ffffff', 
                  color: !isLogin ? '#ffffff' : '#42526e',
                  transition: 'all 0.1s'
                }}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ backgroundColor: '#ffebe6', border: '1px solid #ff5630', color: '#de350b', padding: '12px', fontSize: '14px', borderRadius: '3px' }}>
                {error}
              </div>
            )}

            {!isLogin && !inviteToken && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5e6c84', marginBottom: '4px' }}>
                  Organization name
                </label>
                <input
                  type="text"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    backgroundColor: '#fafbfc', 
                    border: '2px solid #dfe1e6', 
                    color: '#172b4d', 
                    borderRadius: '3px', 
                    fontSize: '14px', 
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Acme Inc."
                  value={credentials.organization}
                  onChange={(e) => setCredentials({...credentials, organization: e.target.value})}
                  onFocus={(e) => e.target.style.borderColor = '#4c9aff'}
                  onBlur={(e) => e.target.style.borderColor = '#dfe1e6'}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5e6c84', marginBottom: '4px' }}>
                Email address
              </label>
              <input
                type="email"
                required
                disabled={!!inviteToken}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  backgroundColor: inviteToken ? '#f4f5f7' : '#fafbfc', 
                  border: '2px solid #dfe1e6', 
                  color: '#172b4d', 
                  borderRadius: '3px', 
                  fontSize: '14px', 
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: inviteToken ? 0.6 : 1
                }}
                placeholder="Enter email"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                onFocus={(e) => !inviteToken && (e.target.style.borderColor = '#4c9aff')}
                onBlur={(e) => e.target.style.borderColor = '#dfe1e6'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5e6c84', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    paddingRight: '40px', 
                    backgroundColor: '#fafbfc', 
                    border: '2px solid #dfe1e6', 
                    color: '#172b4d', 
                    borderRadius: '3px', 
                    fontSize: '14px', 
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  onFocus={(e) => e.target.style.borderColor = '#4c9aff'}
                  onBlur={(e) => e.target.style.borderColor = '#dfe1e6'}
                />
                <button
                  type="button"
                  style={{ 
                    position: 'absolute', 
                    right: '8px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    backgroundColor: 'transparent', 
                    border: 'none', 
                    color: '#5e6c84', 
                    cursor: 'pointer', 
                    padding: '4px',
                    display: 'flex'
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlashIcon style={{ width: '20px', height: '20px' }} /> : <EyeIcon style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                marginTop: '8px', 
                padding: '10px', 
                backgroundColor: '#0052cc', 
                color: '#ffffff', 
                border: 'none', 
                borderRadius: '3px', 
                fontSize: '14px', 
                fontWeight: 500, 
                cursor: 'pointer', 
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0747a6')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0052cc'}
            >
              {loading ? (isLogin ? 'Logging in...' : 'Creating account...') : (isLogin ? 'Log in' : 'Sign up')}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            {isLogin && !inviteToken && (
              <p style={{ fontSize: '12px', color: '#5e6c84', marginBottom: '12px' }}>
                Don't have an account?{' '}
                <button 
                  onClick={() => setIsLogin(false)} 
                  style={{ color: '#0052cc', fontWeight: 500, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Sign up
                </button>
              </p>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ fontSize: '12px', color: '#5e6c84', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0052cc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#5e6c84'}
            >
              ← Back to home
            </button>
          </div>
        </div>

        {/* Bottom Text */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#5e6c84' }}>
          <p>One account for Knowledgr, Conversations, and Decisions</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
