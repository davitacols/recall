import React, { useEffect, useState } from 'react';
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
  const [compliance, setCompliance] = useState(null);
  const [marketplaceApps, setMarketplaceApps] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectScopes, setProjectScopes] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [escalationRules, setEscalationRules] = useState([]);
  const [showSSOForm, setShowSSOForm] = useState(false);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [busyAppId, setBusyAppId] = useState(null);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const [ssoForm, setSsoForm] = useState({
    provider: 'saml',
    enabled: false,
    entity_id: '',
    sso_url: '',
    x509_cert: '',
    auto_provision_users: true,
    default_role: 'member'
  });

  const [complianceForm, setComplianceForm] = useState({
    data_residency_region: 'us',
    require_sso: false,
    require_mfa: false,
    audit_export_enabled: true,
    third_party_app_approval_required: true,
    retention_days: 365,
    ip_allowlist: '',
    allowed_integrations: 'github,jira,slack',
  });
  const [scopeForm, setScopeForm] = useState({
    project_id: '',
    role: 'manager',
    allowed_permissions: 'create_issue,edit_issue,assign_issue',
    denied_permissions: '',
  });
  const [slaForm, setSlaForm] = useState({
    name: 'Uptime Alert',
    metric: 'uptime',
    threshold_percent: 99.9,
    lookback_days: 30,
    severity: 'high',
    enabled: true,
  });
  const [escalationForm, setEscalationForm] = useState({
    name: 'Critical Incident Escalation',
    incident_type: '',
    min_severity: 'high',
    escalation_delay_minutes: 0,
    create_task: true,
    create_blocker: false,
    notify_admins: true,
    assign_to_role: 'admin',
    enabled: true,
  });

  useEffect(() => {
    fetchEnterpriseData();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchEnterpriseData = async () => {
    try {
      const headers = authHeaders();
      const [sso, manager, training, sla, premise, complianceResp, appsResp, portfolioResp, incidentsResp, projectsResp, scopesResp, slaRulesResp, escalationRulesResp] = await Promise.all([
        fetch(`${API_BASE}/api/organizations/enterprise/sso/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/account-manager/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/training/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/sla/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/on-premise/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/compliance/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/marketplace/apps/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/portfolio-report/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/incidents/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/agile/projects/`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/organizations/enterprise/permissions/project-scopes/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/sla-rules/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/incidents/escalation-rules/`, { headers }).then((r) => r.json()),
      ]);

      setSsoConfig(sso);
      if (sso?.id) setSsoForm({ ...ssoForm, ...sso });
      setAccountManager(manager);
      setTrainings(Array.isArray(training) ? training : []);
      setSlaData(Array.isArray(sla) ? sla : []);
      setOnPremise(premise);
      setCompliance(complianceResp);
      setMarketplaceApps(Array.isArray(appsResp) ? appsResp : []);
      setPortfolio(portfolioResp?.totals ? portfolioResp : null);
      setIncidents(Array.isArray(incidentsResp) ? incidentsResp : []);
      setProjects(Array.isArray(projectsResp) ? projectsResp : []);
      setProjectScopes(Array.isArray(scopesResp) ? scopesResp : []);
      setSlaRules(Array.isArray(slaRulesResp) ? slaRulesResp : []);
      setEscalationRules(Array.isArray(escalationRulesResp) ? escalationRulesResp : []);

      if (complianceResp?.id) {
        setComplianceForm({
          data_residency_region: complianceResp.data_residency_region || 'us',
          require_sso: Boolean(complianceResp.require_sso),
          require_mfa: Boolean(complianceResp.require_mfa),
          audit_export_enabled: Boolean(complianceResp.audit_export_enabled),
          third_party_app_approval_required: Boolean(complianceResp.third_party_app_approval_required),
          retention_days: complianceResp.retention_days || 365,
          ip_allowlist: Array.isArray(complianceResp.ip_allowlist) ? complianceResp.ip_allowlist.join(',') : '',
          allowed_integrations: Array.isArray(complianceResp.allowed_integrations) ? complianceResp.allowed_integrations.join(',') : '',
        });
      }
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
    }
  };

  const handleSSOSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch(`${API_BASE}/api/organizations/enterprise/sso/`, {
      method: ssoConfig?.id ? 'PUT' : 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ssoForm),
    });

    if (response.ok) {
      alert('SSO configuration saved');
      setShowSSOForm(false);
      fetchEnterpriseData();
    }
  };

  const handleComplianceSubmit = async (e) => {
    e.preventDefault();
    setSavingCompliance(true);
    try {
      const payload = {
        ...complianceForm,
        retention_days: Number(complianceForm.retention_days) || 365,
        ip_allowlist: complianceForm.ip_allowlist.split(',').map((v) => v.trim()).filter(Boolean),
        allowed_integrations: complianceForm.allowed_integrations.split(',').map((v) => v.trim()).filter(Boolean),
      };
      const response = await fetch(`${API_BASE}/api/organizations/enterprise/compliance/`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Unable to save compliance policy');
      await fetchEnterpriseData();
      alert('Compliance policy updated');
    } catch (error) {
      console.error(error);
      alert('Unable to update compliance policy');
    } finally {
      setSavingCompliance(false);
    }
  };

  const toggleMarketplaceApp = async (app) => {
    setBusyAppId(app.id);
    try {
      const endpoint = app.installed
        ? `${API_BASE}/api/organizations/enterprise/marketplace/apps/${app.id}/uninstall/`
        : `${API_BASE}/api/organizations/enterprise/marketplace/apps/${app.id}/install/`;
      const response = await fetch(endpoint, {
        method: app.installed ? 'DELETE' : 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: app.installed ? undefined : JSON.stringify({}),
      });
      if (!response.ok) throw new Error('App operation failed');
      await fetchEnterpriseData();
    } catch (error) {
      console.error(error);
      alert(`Unable to ${app.installed ? 'uninstall' : 'install'} app`);
    } finally {
      setBusyAppId(null);
    }
  };

  const runIncidentAutomation = async () => {
    setRunningAutomation(true);
    try {
      const response = await fetch(`${API_BASE}/api/organizations/enterprise/incidents/run-automation/`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Unable to run automation');
      await fetchEnterpriseData();
      alert(`Incident automation completed. Created ${payload.created_count || 0} incident(s).`);
    } catch (error) {
      console.error(error);
      alert('Unable to run incident automation');
    } finally {
      setRunningAutomation(false);
    }
  };

  const saveProjectScope = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const payload = {
        project_id: Number(scopeForm.project_id),
        role: scopeForm.role,
        allowed_permissions: scopeForm.allowed_permissions.split(',').map((v) => v.trim()).filter(Boolean),
        denied_permissions: scopeForm.denied_permissions.split(',').map((v) => v.trim()).filter(Boolean),
      };
      const response = await fetch(`${API_BASE}/api/organizations/enterprise/permissions/project-scopes/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save scope');
      await fetchEnterpriseData();
    } catch (error) {
      console.error(error);
      alert('Unable to save project permission scope');
    } finally {
      setSavingRules(false);
    }
  };

  const createSlaRule = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const response = await fetch(`${API_BASE}/api/organizations/enterprise/sla-rules/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(slaForm),
      });
      if (!response.ok) throw new Error('Failed to create SLA rule');
      await fetchEnterpriseData();
    } catch (error) {
      console.error(error);
      alert('Unable to create SLA rule');
    } finally {
      setSavingRules(false);
    }
  };

  const createEscalationRule = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const response = await fetch(`${API_BASE}/api/organizations/enterprise/incidents/escalation-rules/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(escalationForm),
      });
      if (!response.ok) throw new Error('Failed to create escalation rule');
      await fetchEnterpriseData();
    } catch (error) {
      console.error(error);
      alert('Unable to create escalation rule');
    } finally {
      setSavingRules(false);
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

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
          <div>
            <h2 className="text-xl font-semibold">Governance and Compliance Policy</h2>
            <p className="text-sm text-gray-600">Data residency, retention, security requirements, and app governance</p>
          </div>
        </div>
        <form onSubmit={handleComplianceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Residency Region</label>
            <select
              value={complianceForm.data_residency_region}
              onChange={(e) => setComplianceForm({ ...complianceForm, data_residency_region: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="us">United States</option>
              <option value="eu">European Union</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="apac">Asia Pacific</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Retention (days)</label>
            <input
              type="number"
              min="30"
              value={complianceForm.retention_days}
              onChange={(e) => setComplianceForm({ ...complianceForm, retention_days: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IP Allowlist (comma-separated)</label>
            <input
              type="text"
              value={complianceForm.ip_allowlist}
              onChange={(e) => setComplianceForm({ ...complianceForm, ip_allowlist: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Allowed Integrations (comma-separated)</label>
            <input
              type="text"
              value={complianceForm.allowed_integrations}
              onChange={(e) => setComplianceForm({ ...complianceForm, allowed_integrations: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={complianceForm.require_sso} onChange={(e) => setComplianceForm({ ...complianceForm, require_sso: e.target.checked })} />
            <span className="text-sm">Require SSO</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={complianceForm.require_mfa} onChange={(e) => setComplianceForm({ ...complianceForm, require_mfa: e.target.checked })} />
            <span className="text-sm">Require MFA</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={complianceForm.audit_export_enabled} onChange={(e) => setComplianceForm({ ...complianceForm, audit_export_enabled: e.target.checked })} />
            <span className="text-sm">Enable Audit Exports</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={complianceForm.third_party_app_approval_required} onChange={(e) => setComplianceForm({ ...complianceForm, third_party_app_approval_required: e.target.checked })} />
            <span className="text-sm">Require Third-Party App Approval</span>
          </label>
          <div className="md:col-span-2">
            <button type="submit" disabled={savingCompliance} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {savingCompliance ? 'Saving...' : 'Save Compliance Policy'}
            </button>
          </div>
        </form>
        {compliance?.updated_at && (
          <p style={{ color: secondaryText, marginTop: '10px', fontSize: '12px' }}>
            Last updated: {new Date(compliance.updated_at).toLocaleString()}
          </p>
        )}
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <h2 className="text-xl font-semibold mb-2">Project Permission Scopes</h2>
        <p className="text-sm text-gray-600 mb-4">Granular role permissions per project</p>
        <form onSubmit={saveProjectScope} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <select value={scopeForm.project_id} onChange={(e) => setScopeForm({ ...scopeForm, project_id: e.target.value })} className="border rounded-lg px-3 py-2" required>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={scopeForm.role} onChange={(e) => setScopeForm({ ...scopeForm, role: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="contributor">contributor</option>
          </select>
          <input type="text" value={scopeForm.allowed_permissions} onChange={(e) => setScopeForm({ ...scopeForm, allowed_permissions: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="allowed perms csv" />
          <input type="text" value={scopeForm.denied_permissions} onChange={(e) => setScopeForm({ ...scopeForm, denied_permissions: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="denied perms csv" />
          <div className="md:col-span-4">
            <button disabled={savingRules} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">Save Scope</button>
          </div>
        </form>
        <div className="space-y-2">
          {projectScopes.slice(0, 8).map((scope) => (
            <div key={scope.id} className="border rounded-lg p-3">
              <p className="font-semibold">{scope.project_name} | {scope.role}</p>
              <p className="text-xs text-gray-500">Allow: {(scope.allowed_permissions || []).join(', ') || '-'}</p>
              <p className="text-xs text-gray-500">Deny: {(scope.denied_permissions || []).join(', ') || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center gap-3 mb-4">
          <ServerIcon className="w-8 h-8 text-cyan-600" />
          <div>
            <h2 className="text-xl font-semibold">App Marketplace</h2>
            <p className="text-sm text-gray-600">Install apps and integrations for your workspace</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketplaceApps.map((app) => (
            <div key={app.id} className="border rounded-lg p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-semibold">{app.name}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{app.category} | {app.vendor} | {app.pricing}</p>
                  <p className="text-sm text-gray-600 mt-2">{app.description}</p>
                </div>
                <button
                  onClick={() => toggleMarketplaceApp(app)}
                  disabled={busyAppId === app.id}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${app.installed ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-cyan-600 text-white hover:bg-cyan-700'} disabled:opacity-50`}
                >
                  {busyAppId === app.id ? 'Please wait...' : app.installed ? 'Uninstall' : 'Install'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Portfolio Reporting</h2>
            <p className="text-sm text-gray-600">Cross-project delivery and risk metrics</p>
          </div>
        </div>
        {portfolio ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              <Metric label="Projects" value={portfolio.totals.projects} />
              <Metric label="Issues" value={portfolio.totals.issues} />
              <Metric label="Completed" value={portfolio.totals.done} />
              <Metric label="Completion" value={`${portfolio.totals.completion_percent}%`} />
              <Metric label="Overdue" value={portfolio.totals.overdue_issues} />
              <Metric label="Blockers" value={portfolio.totals.active_blockers} />
            </div>
            <div className="space-y-2">
              {(portfolio.projects || []).slice(0, 6).map((project) => (
                <div key={project.project_id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{project.project_name}</p>
                    <p className="text-xs text-gray-500">
                      {project.done_count}/{project.issue_count} done | overdue {project.overdue_issues} | blockers {project.active_blockers}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">Risk {project.risk_score}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-500">No portfolio data available.</p>
        )}
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <h2 className="text-xl font-semibold mb-2">SLA Rule Builder</h2>
        <p className="text-sm text-gray-600 mb-4">Define threshold-driven SLA incident rules</p>
        <form onSubmit={createSlaRule} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <input value={slaForm.name} onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="Rule name" required />
          <select value={slaForm.metric} onChange={(e) => setSlaForm({ ...slaForm, metric: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="uptime">uptime</option>
            <option value="response_time">response_time</option>
            <option value="resolution_time">resolution_time</option>
            <option value="support_response">support_response</option>
          </select>
          <input type="number" step="0.01" value={slaForm.threshold_percent} onChange={(e) => setSlaForm({ ...slaForm, threshold_percent: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="threshold %" />
          <input type="number" value={slaForm.lookback_days} onChange={(e) => setSlaForm({ ...slaForm, lookback_days: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="lookback days" />
          <select value={slaForm.severity} onChange={(e) => setSlaForm({ ...slaForm, severity: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
          <button disabled={savingRules} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Create Rule</button>
        </form>
        <div className="space-y-2">
          {slaRules.map((rule) => (
            <div key={rule.id} className="border rounded-lg p-3 flex items-center justify-between">
              <p className="font-semibold">{rule.name} ({rule.metric})</p>
              <p className="text-xs text-gray-500">threshold {rule.threshold_percent}% | {rule.lookback_days}d | {rule.severity}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <h2 className="text-xl font-semibold mb-2">Escalation Workflow Rules</h2>
        <p className="text-sm text-gray-600 mb-4">Auto-create tasks/blockers and notify admins from incidents</p>
        <form onSubmit={createEscalationRule} className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-4">
          <input value={escalationForm.name} onChange={(e) => setEscalationForm({ ...escalationForm, name: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="Rule name" required />
          <select value={escalationForm.incident_type} onChange={(e) => setEscalationForm({ ...escalationForm, incident_type: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="">all</option><option value="sla_risk">sla_risk</option><option value="blocker_spike">blocker_spike</option><option value="delivery_risk">delivery_risk</option>
          </select>
          <select value={escalationForm.min_severity} onChange={(e) => setEscalationForm({ ...escalationForm, min_severity: e.target.value })} className="border rounded-lg px-3 py-2">
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
          <input type="number" value={escalationForm.escalation_delay_minutes} onChange={(e) => setEscalationForm({ ...escalationForm, escalation_delay_minutes: e.target.value })} className="border rounded-lg px-3 py-2" placeholder="delay min" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={escalationForm.create_task} onChange={(e) => setEscalationForm({ ...escalationForm, create_task: e.target.checked })} />task</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={escalationForm.create_blocker} onChange={(e) => setEscalationForm({ ...escalationForm, create_blocker: e.target.checked })} />blocker</label>
          <button disabled={savingRules} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50">Create Rule</button>
        </form>
        <div className="space-y-2">
          {escalationRules.map((rule) => (
            <div key={rule.id} className="border rounded-lg p-3">
              <p className="font-semibold">{rule.name}</p>
              <p className="text-xs text-gray-500">{rule.incident_type || 'all'} | min {rule.min_severity} | {rule.escalation_delay_minutes}m | task:{String(rule.create_task)} blocker:{String(rule.create_blocker)}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Incident and SLA Automation</h2>
            <p className="text-sm text-gray-600">Detect blocker and SLA risks and notify admins</p>
          </div>
          <button
            onClick={runIncidentAutomation}
            disabled={runningAutomation}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
          >
            {runningAutomation ? 'Running...' : 'Run Automation'}
          </button>
        </div>
        {(incidents || []).length > 0 ? (
          <div className="space-y-2">
            {incidents.slice(0, 8).map((incident) => (
              <div key={incident.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{incident.title}</p>
                  <p className="text-xs text-gray-500">{incident.incident_type} | {incident.severity} | {incident.status}</p>
                </div>
                <span className="text-xs text-gray-500">{new Date(incident.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No incidents detected.</p>
        )}
      </div>

      <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">SSO and SAML Authentication</h2>
              <p className="text-sm text-gray-600">Single sign-on configuration</p>
            </div>
          </div>
          <button onClick={() => setShowSSOForm(!showSSOForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {showSSOForm ? 'Cancel' : 'Configure SSO'}
          </button>
        </div>

        {ssoConfig?.enabled && !showSSOForm && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">SSO Enabled</p>
            <p className="text-sm text-gray-600 mt-1">Provider: {ssoConfig.provider?.toUpperCase()}</p>
            <p className="text-sm text-gray-600">Entity ID: {ssoConfig.entity_id}</p>
          </div>
        )}

        {showSSOForm && (
          <form onSubmit={handleSSOSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <select value={ssoForm.provider} onChange={(e) => setSsoForm({ ...ssoForm, provider: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                <option value="saml">SAML 2.0</option>
                <option value="okta">Okta</option>
                <option value="azure">Azure AD</option>
                <option value="google">Google Workspace</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entity ID</label>
              <input type="text" value={ssoForm.entity_id} onChange={(e) => setSsoForm({ ...ssoForm, entity_id: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SSO URL</label>
              <input type="url" value={ssoForm.sso_url} onChange={(e) => setSsoForm({ ...ssoForm, sso_url: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">X.509 Certificate</label>
              <textarea value={ssoForm.x509_cert} onChange={(e) => setSsoForm({ ...ssoForm, x509_cert: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows="4" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={ssoForm.enabled} onChange={(e) => setSsoForm({ ...ssoForm, enabled: e.target.checked })} className="rounded" />
              <label className="text-sm">Enable SSO</label>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Configuration</button>
          </form>
        )}
      </div>

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
            <p className="text-gray-600 mt-1">{accountManager.email}</p>
            {accountManager.phone && <p className="text-gray-600">{accountManager.phone}</p>}
            <p className="text-sm text-gray-500 mt-2">Timezone: {accountManager.timezone}</p>
            {accountManager.availability && <p className="text-sm text-gray-600 mt-1">{accountManager.availability}</p>}
          </div>
        </div>
      )}

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
            {trainings.map((training) => (
              <div key={training.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{training.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>
                    {training.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No training programs scheduled</p>
        )}
      </div>

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
            {slaData.map((sla) => (
              <div key={sla.id} className="border rounded-lg p-4">
                <h3 className="font-medium capitalize">{sla.metric.replace('_', ' ')}</h3>
                <div className="text-sm text-gray-600 mt-2">
                  <p>Guaranteed: {sla.guaranteed_value}%</p>
                  {sla.actual_value && <p>Actual: {sla.actual_value}%</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No SLA data available</p>
        )}
      </div>

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
            <p className="font-medium">Status: {onPremise.status}</p>
            <p className="text-sm text-gray-600">Location: {onPremise.server_location}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
