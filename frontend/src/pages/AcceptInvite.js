import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok) {
        setInvitation(data);
      } else {
        setError(data.error || 'Invalid invitation');
      }
    } catch (err) {
      setError('Invalid invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/accept/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (response.ok) {
        // Store token and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        window.location.href = '/';
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white border border-gray-200 p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/login" className="text-gray-900 font-medium hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white border border-gray-200 p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Join {invitation.organization}</h1>
        <p className="text-gray-600 mb-8">
          You've been invited as a <span className="font-bold">{invitation.role}</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleAccept}>
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">
              Full Name
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
              Email
            </label>
            <input
              type="email"
              value={invitation.email}
              disabled
              className="w-full p-3 border border-gray-300 bg-gray-100"
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
            className="w-full py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium"
          >
            Accept Invitation
          </button>
        </form>
      </div>
    </div>
  );
}

export default AcceptInvite;
