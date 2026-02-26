import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, UserGroupIcon, AcademicCapIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function Enterprise() {
  const { darkMode } = useTheme();
  const [ssoConfig, setSsoConfig] = useState(null);
  const [accountManager, setAccountManager] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [onPremise, setOnPremise] = useState(null);
  const [showSSOForm, setShowSSOForm] = useState(false);
  const [ssoForm, setSsoForm] = useState({
    provider: 'saml',
    enabled: false,
    entity_id: '',
    sso_url: '',
    x509_cert: '',
    auto_provision_users: true,
    default_role: 'member'
  });

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  const fetchEnterpriseData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [sso, manager, training, sla, premise] = await Promise.all([
        fetch(`${API_BASE}/api/organizations/enterprise/sso/`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/account-manager/`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/training/`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/sla/`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/on-premise/`, { headers }).then(r => r.json())
      ]);

      setSsoConfig(sso);
      if (sso.id) setSsoForm(sso);
      setAccountManager(manager);
      setTrainings(training);
      setSlaData(sla);
      setOnPremise(premise);
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
    }
  };

  const handleSSOSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}/api/organizations/enterprise/sso/`, {
      method: ssoConfig?.id ? 'PUT' : 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ssoForm)
    });

    if (response.ok) {
      alert('SSO configuration saved');
      setShowSSOForm(false);
      fetchEnterpriseData();
    }
  };

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const secondaryText = darkMode ? '#a8a29e' : '#6b7280';

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      requested: 'bg-purple-100 text-purple-800',
      deployed: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, marginBottom: '24px' }}>Enterprise Features</h1>

      {/* SSO Configuration */}
      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '5px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">SSO/SAML Authentication</h2>
              <p className="text-sm text-gray-600">Single Sign-On configuration</p>
            </div>
          </div>
          <button
            onClick={() => setShowSSOForm(!showSSOForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showSSOForm ? 'Cancel' : 'Configure SSO'}
          </button>
        </div>

        {ssoConfig?.enabled && !showSSOForm && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">âœ“ SSO Enabled</p>
            <p className="text-sm text-gray-600 mt-1">Provider: {ssoConfig.provider.toUpperCase()}</p>
            <p className="text-sm text-gray-600">Entity ID: {ssoConfig.entity_id}</p>
          </div>
        )}

        {showSSOForm && (
          <form onSubmit={handleSSOSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select
                value={ssoForm.provider}
                onChange={(e) => setSsoForm({...ssoForm, provider: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="saml">SAML 2.0</option>
                <option value="okta">Okta</option>
                <option value="azure">Azure AD</option>
                <option value="google">Google Workspace</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entity ID</label>
              <input
                type="text"
                value={ssoForm.entity_id}
                onChange={(e) => setSsoForm({...ssoForm, entity_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="https://your-idp.com/entity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SSO URL</label>
              <input
                type="url"
                value={ssoForm.sso_url}
                onChange={(e) => setSsoForm({...ssoForm, sso_url: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="https://your-idp.com/sso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">X.509 Certificate</label>
              <textarea
                value={ssoForm.x509_cert}
                onChange={(e) => setSsoForm({...ssoForm, x509_cert: e.target.value})}
                className="w-full border rounded-lg px-3 py-2"
                rows="4"
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ssoForm.enabled}
                onChange={(e) => setSsoForm({...ssoForm, enabled: e.target.checked})}
                className="rounded"
              />
              <label className="text-sm">Enable SSO</label>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Save Configuration
            </button>
          </form>
        )}
      </div>

      {/* Account Manager */}
      {accountManager?.name && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold">Dedicated Account Manager</h2>
              <p className="text-sm text-gray-600">Your personal support contact</p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="font-medium text-lg">{accountManager.name}</p>
            <p className="text-gray-600 mt-1">ðŸ“§ {accountManager.email}</p>
            {accountManager.phone && <p className="text-gray-600">ðŸ“ž {accountManager.phone}</p>}
            <p className="text-sm text-gray-500 mt-2">Timezone: {accountManager.timezone}</p>
            {accountManager.availability && (
              <p className="text-sm text-gray-600 mt-1">{accountManager.availability}</p>
            )}
          </div>
        </div>
      )}

      {/* Training Programs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <AcademicCapIcon className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold">Custom Training Programs</h2>
            <p className="text-sm text-gray-600">Scheduled training sessions</p>
          </div>
        </div>
        {trainings.length > 0 ? (
          <div className="space-y-3">
            {trainings.map(training => (
              <div key={training.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{training.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>ðŸ“… {new Date(training.training_date).toLocaleDateString()}</span>
                      <span>â±ï¸ {training.duration_hours}h</span>
                      {training.location && <span>ðŸ“ {training.location}</span>}
                      {training.trainer && <span>ðŸ‘¨â€ðŸ« {training.trainer}</span>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>
                    {training.status.replace('_', ' ')}
                  </span>
                </div>
                {training.recording_url && (
                  <a href={training.recording_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                    View Recording â†’
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No training programs scheduled</p>
        )}
      </div>

      {/* SLA Guarantees */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="w-8 h-8 text-orange-600" />
          <div>
            <h2 className="text-xl font-semibold">SLA Guarantees</h2>
            <p className="text-sm text-gray-600">Service level performance tracking</p>
          </div>
        </div>
        {slaData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slaData.map(sla => (
              <div key={sla.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium capitalize">{sla.metric.replace('_', ' ')}</h3>
                  {sla.met !== null && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${sla.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {sla.met ? 'âœ“ Met' : 'âœ— Not Met'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Guaranteed: {sla.guaranteed_value}%</p>
                  {sla.actual_value && <p>Actual: {sla.actual_value}%</p>}
                  <p className="text-xs mt-1">
                    {new Date(sla.period_start).toLocaleDateString()} - {new Date(sla.period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No SLA data available</p>
        )}
      </div>

      {/* On-Premise Deployment */}
      {onPremise?.id && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <ServerIcon className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold">On-Premise Deployment</h2>
              <p className="text-sm text-gray-600">Self-hosted installation</p>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(onPremise.status)}`}>
                  {onPremise.status}
                </span>
              </div>
              {onPremise.version && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="font-medium">{onPremise.version}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-medium">{onPremise.server_location}</p>
              </div>
              <div>
                <p className="text-gray-600">Database</p>
                <p className="font-medium">{onPremise.database_type}</p>
              </div>
              {onPremise.deployment_date && (
                <div>
                  <p className="text-gray-600">Deployed</p>
                  <p className="font-medium">{new Date(onPremise.deployment_date).toLocaleDateString()}</p>
                </div>
              )}
              {onPremise.last_update && (
                <div>
                  <p className="text-gray-600">Last Update</p>
                  <p className="font-medium">{new Date(onPremise.last_update).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            {(onPremise.support_email || onPremise.support_phone) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Support Contact</p>
                {onPremise.support_email && <p className="text-sm text-gray-600">ðŸ“§ {onPremise.support_email}</p>}
                {onPremise.support_phone && <p className="text-sm text-gray-600">ðŸ“ž {onPremise.support_phone}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



