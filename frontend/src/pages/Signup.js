import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white border border-gray-200 p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Organization</h1>
        <p className="text-gray-600 mb-8">Start your team's knowledge hub</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Organization Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Organization Slug
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="your-company"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Your Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full p-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
