import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import '../pages/Homepage.css';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/organizations/signup/', formData);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Left Panel - Branding */}
      <div style={{ flex: 1, backgroundColor: '#0052CC', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#ffffff' }}>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <img src="/recalljpg.jpg" alt="Knowledgr" style={{ height: '40px' }} />
            <span style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>RECALL</span>
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 700, lineHeight: '1.2', marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Create your organization
          </h1>
          <p style={{ fontSize: '18px', lineHeight: '1.6', opacity: 0.9, marginBottom: '48px' }}>
            Start capturing and organizing your team's knowledge. Build a shared memory that grows with your organization.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <span style={{ fontSize: '14px' }}>✓</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Centralized knowledge</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Keep all conversations and decisions in one place</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <span style={{ fontSize: '14px' }}>✓</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Team collaboration</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Work together seamlessly across your organization</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <span style={{ fontSize: '14px' }}>✓</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Instant insights</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>Find information quickly with powerful search</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div style={{ flex: 1, backgroundColor: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '48px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#172B4D', marginBottom: '8px', letterSpacing: '-0.01em' }}>Get started</h2>
            <p style={{ fontSize: '14px', color: '#6B778C', marginBottom: '32px' }}>Create your organization account</p>

            {error && (
              <div style={{ marginBottom: '24px', padding: '12px 16px', backgroundColor: '#FFEBE6', border: '1px solid #FF5630', borderRadius: '6px', color: '#BF2600', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Organization Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="Acme Inc."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Organization Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="your-company"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Your Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="johndoe"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#172B4D', marginBottom: '6px' }}>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #DFE1E6', borderRadius: '6px', fontSize: '14px', color: '#172B4D', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={(e) => e.target.style.borderColor = '#0052CC'}
                  onBlur={(e) => e.target.style.borderColor = '#DFE1E6'}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', marginTop: '8px', padding: '12px', backgroundColor: '#0052CC', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0747A6')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0052CC')}
              >
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', marginRight: '8px' }}></div>
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#6B778C' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#0052CC', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/')}
                style={{ fontSize: '14px', color: '#6B778C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#172B4D'}
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

export default Signup;
