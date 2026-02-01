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
    <div className="min-h-screen w-full bg-amber-950 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Hero Image */}
        <div className="hidden lg:block rounded-2xl overflow-hidden border border-amber-700/40 h-96">
          <img src="/hero.png" alt="Dashboard Preview" className="w-full h-full object-contain" />
        </div>

        {/* Signup Form */}
        <div className="w-full">
          <div className="bg-amber-900/80 backdrop-blur-sm border border-amber-700/40 rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img src="/recalljpg.jpg" alt="RECALL" className="h-10" />
                <span className="text-2xl font-bold text-white">RECALL</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Create Organization</h1>
              <p className="text-amber-100/60 text-sm">Start your team's knowledge hub</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 p-3 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="Acme Inc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="your-company"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="johndoe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-800/40 border border-amber-700/30 text-white placeholder-amber-100/40 rounded-lg focus:outline-none focus:border-amber-600 transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-full font-semibold transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Organization'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-amber-100/60">
                Already have an account?{' '}
                <Link to="/login" className="text-white font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Back to Homepage */}
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-amber-100/60 hover:text-white transition"
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
