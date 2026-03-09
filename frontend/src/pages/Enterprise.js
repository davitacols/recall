import React, { useEffect, useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  BoltIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import './Enterprise.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function getAppLaunchTarget(app) {
  const launchPath = (app?.launch_path || '').trim();
  if (launchPath) {
    if (launchPath.startsWith('http://') || launchPath.startsWith('https://')) {
      return { type: 'external', href: launchPath };
    }
    return { type: 'internal', href: launchPath };
  }
  if (app?.docs_url) return { type: 'external', href: app.docs_url };
  return { type: 'internal', href: '/enterprise' };
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

function statusTone(status) {
  const tones = {
    scheduled: 'neutral',
    in_progress: 'warn',
    completed: 'ok',
    cancelled: 'danger',
    requested: 'neutral',
    deployed: 'ok',
    maintenance: 'warn',
    open: 'danger',
    resolved: 'ok',
  };
  return tones[status] || 'neutral';
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="enterprise-metric">
      <p className="enterprise-metric-value">{value}</p>
      <p className="enterprise-metric-label">{label}</p>
      {hint ? <p className="enterprise-metric-hint">{hint}</p> : null}
    </article>
  );
}

function SectionCard({ icon: Icon, title, subtitle, actions, children }) {
  return (
    <section className="enterprise-section-card">
      <header className="enterprise-section-header">
        <div className="enterprise-section-title-wrap">
          {Icon ? <Icon className="enterprise-section-icon" /> : null}
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="enterprise-section-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export default function Enterprise() {
  const [ssoConfig, setSsoConfig] = useState(null);
  const [accountManager, setAccountManager] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [onPremise, setOnPremise] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [marketplaceApps, setMarketplaceApps] = useState([]);
  const [featuredMarketplace, setFeaturedMarketplace] = useState([]);
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
    default_role: 'member',
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
      const [
        sso,
        manager,
        training,
        sla,
        premise,
        complianceResp,
        appsResp,
        featuredAppsResp,
        portfolioResp,
        incidentsResp,
        projectsResp,
        scopesResp,
        slaRulesResp,
        escalationRulesResp,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/organizations/enterprise/sso/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/account-manager/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/training/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/sla/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/on-premise/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/compliance/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/marketplace/apps/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/marketplace/featured/`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/organizations/enterprise/portfolio-report/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/incidents/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/agile/projects/`, { headers }).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/organizations/enterprise/permissions/project-scopes/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/sla-rules/`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/api/organizations/enterprise/incidents/escalation-rules/`, { headers }).then((r) => r.json()),
      ]);

      setSsoConfig(sso);
      if (sso?.id) {
        setSsoForm((prev) => ({ ...prev, ...sso }));
      }
      setAccountManager(manager);
      setTrainings(Array.isArray(training) ? training : []);
      setSlaData(Array.isArray(sla) ? sla : []);
      setOnPremise(premise);
      setCompliance(complianceResp);
      setMarketplaceApps(Array.isArray(appsResp) ? appsResp : []);
      setFeaturedMarketplace(Array.isArray(featuredAppsResp) ? featuredAppsResp : []);
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
          allowed_integrations: Array.isArray(complianceResp.allowed_integrations)
            ? complianceResp.allowed_integrations.join(',')
            : '',
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
        ip_allowlist: complianceForm.ip_allowlist
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        allowed_integrations: complianceForm.allowed_integrations
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
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
        allowed_permissions: scopeForm.allowed_permissions
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        denied_permissions: scopeForm.denied_permissions
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
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

  const summaryMetrics = useMemo(() => {
    const totals = portfolio?.totals || {};
    return [
      { label: 'Policy Controls', value: `${Object.values(complianceForm).filter(Boolean).length}` },
      { label: 'Marketplace Apps', value: marketplaceApps.length, hint: `${marketplaceApps.filter((a) => a.installed).length} installed` },
      { label: 'Open Incidents', value: incidents.filter((item) => item.status !== 'resolved').length },
      { label: 'Project Coverage', value: totals.projects || 0, hint: `${projectScopes.length} scoped roles` },
    ];
  }, [portfolio, complianceForm, marketplaceApps, incidents, projectScopes]);

  const featuredMarketplaceApps = useMemo(() => {
    if (featuredMarketplace.length) {
      return featuredMarketplace.map((app) => ({
        slug: app.slug,
        meta: app.meta || `${app.category} | ${app.vendor} | ${app.pricing}`,
        app,
      }));
    }
    const featured = [
      { slug: 'github-advanced-sync', meta: 'engineering | Knoledgr | included' },
      { slug: 'incident-ops-feed', meta: 'automation | Knoledgr | enterprise' },
      { slug: 'jira-portfolio-bridge', meta: 'reporting | Knoledgr | included' },
    ];
    const bySlug = new Map(marketplaceApps.map((app) => [app.slug, app]));
    return featured
      .map((item) => ({ ...item, app: bySlug.get(item.slug) }))
      .filter((item) => item.app);
  }, [featuredMarketplace, marketplaceApps]);

  return (
    <div className="enterprise-page">
      <header className="enterprise-hero">
        <div>
          <p className="enterprise-eyebrow">Enterprise Console</p>
          <h1>Governance, reliability, and operations in one surface</h1>
          <p className="enterprise-hero-copy">
            Manage SSO, compliance, app governance, SLA automation, and portfolio risk with an operations-first enterprise workspace.
          </p>
        </div>
        <div className="enterprise-hero-actions">
          <button type="button" className="enterprise-btn enterprise-btn-primary" onClick={() => setShowSSOForm((v) => !v)}>
            {showSSOForm ? 'Close SSO Editor' : 'Configure SSO'}
          </button>
          <button
            type="button"
            className="enterprise-btn enterprise-btn-secondary"
            disabled={runningAutomation}
            onClick={runIncidentAutomation}
          >
            {runningAutomation ? 'Running automation...' : 'Run Incident Automation'}
          </button>
        </div>
      </header>

      <section className="enterprise-metric-grid">
        {summaryMetrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
        ))}
      </section>

      <div className="enterprise-grid">
        <SectionCard
          icon={ShieldCheckIcon}
          title="Governance Policy"
          subtitle="Data region, retention, MFA/SSO requirements, and integration controls"
        >
          <form onSubmit={handleComplianceSubmit} className="enterprise-form-grid">
            <label>
              <span>Data Residency Region</span>
              <select
                value={complianceForm.data_residency_region}
                onChange={(e) => setComplianceForm({ ...complianceForm, data_residency_region: e.target.value })}
              >
                <option value="us">United States</option>
                <option value="eu">European Union</option>
                <option value="uk">United Kingdom</option>
                <option value="ca">Canada</option>
                <option value="apac">Asia Pacific</option>
              </select>
            </label>
            <label>
              <span>Retention Days</span>
              <input
                type="number"
                min="30"
                value={complianceForm.retention_days}
                onChange={(e) => setComplianceForm({ ...complianceForm, retention_days: e.target.value })}
              />
            </label>
            <label className="enterprise-col-span">
              <span>IP Allowlist (comma-separated)</span>
              <input
                type="text"
                value={complianceForm.ip_allowlist}
                onChange={(e) => setComplianceForm({ ...complianceForm, ip_allowlist: e.target.value })}
              />
            </label>
            <label className="enterprise-col-span">
              <span>Allowed Integrations (comma-separated)</span>
              <input
                type="text"
                value={complianceForm.allowed_integrations}
                onChange={(e) => setComplianceForm({ ...complianceForm, allowed_integrations: e.target.value })}
              />
            </label>
            <label className="enterprise-check"><input type="checkbox" checked={complianceForm.require_sso} onChange={(e) => setComplianceForm({ ...complianceForm, require_sso: e.target.checked })} /><span>Require SSO</span></label>
            <label className="enterprise-check"><input type="checkbox" checked={complianceForm.require_mfa} onChange={(e) => setComplianceForm({ ...complianceForm, require_mfa: e.target.checked })} /><span>Require MFA</span></label>
            <label className="enterprise-check"><input type="checkbox" checked={complianceForm.audit_export_enabled} onChange={(e) => setComplianceForm({ ...complianceForm, audit_export_enabled: e.target.checked })} /><span>Enable audit exports</span></label>
            <label className="enterprise-check"><input type="checkbox" checked={complianceForm.third_party_app_approval_required} onChange={(e) => setComplianceForm({ ...complianceForm, third_party_app_approval_required: e.target.checked })} /><span>Require app approval</span></label>
            <div className="enterprise-col-span enterprise-inline-actions">
              <button type="submit" className="enterprise-btn enterprise-btn-primary" disabled={savingCompliance}>
                {savingCompliance ? 'Saving...' : 'Save Governance Policy'}
              </button>
              <p className="enterprise-meta">Last update: {formatDateTime(compliance?.updated_at)}</p>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          icon={UserGroupIcon}
          title="Identity and Access"
          subtitle="Single sign-on and role scoping per project"
        >
          {ssoConfig?.enabled && !showSSOForm ? (
            <div className="enterprise-callout">
              <p>SSO enabled with {ssoConfig.provider?.toUpperCase()}.</p>
              <p>Entity ID: {ssoConfig.entity_id || 'Not set'}</p>
            </div>
          ) : null}

          {showSSOForm ? (
            <form onSubmit={handleSSOSubmit} className="enterprise-stack">
              <label>
                <span>Provider</span>
                <select value={ssoForm.provider} onChange={(e) => setSsoForm({ ...ssoForm, provider: e.target.value })}>
                  <option value="saml">SAML 2.0</option>
                  <option value="okta">Okta</option>
                  <option value="azure">Azure AD</option>
                  <option value="google">Google Workspace</option>
                </select>
              </label>
              <label>
                <span>Entity ID</span>
                <input type="text" value={ssoForm.entity_id} onChange={(e) => setSsoForm({ ...ssoForm, entity_id: e.target.value })} />
              </label>
              <label>
                <span>SSO URL</span>
                <input type="url" value={ssoForm.sso_url} onChange={(e) => setSsoForm({ ...ssoForm, sso_url: e.target.value })} />
              </label>
              <label>
                <span>X.509 Certificate</span>
                <textarea rows="4" value={ssoForm.x509_cert} onChange={(e) => setSsoForm({ ...ssoForm, x509_cert: e.target.value })} />
              </label>
              <label className="enterprise-check">
                <input type="checkbox" checked={ssoForm.enabled} onChange={(e) => setSsoForm({ ...ssoForm, enabled: e.target.checked })} />
                <span>Enable SSO</span>
              </label>
              <button type="submit" className="enterprise-btn enterprise-btn-primary">Save SSO Configuration</button>
            </form>
          ) : null}

          <form onSubmit={saveProjectScope} className="enterprise-form-grid enterprise-top-gap">
            <label>
              <span>Project</span>
              <select value={scopeForm.project_id} onChange={(e) => setScopeForm({ ...scopeForm, project_id: e.target.value })} required>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Role</span>
              <select value={scopeForm.role} onChange={(e) => setScopeForm({ ...scopeForm, role: e.target.value })}>
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="contributor">contributor</option>
              </select>
            </label>
            <label className="enterprise-col-span">
              <span>Allowed Permissions (CSV)</span>
              <input type="text" value={scopeForm.allowed_permissions} onChange={(e) => setScopeForm({ ...scopeForm, allowed_permissions: e.target.value })} />
            </label>
            <label className="enterprise-col-span">
              <span>Denied Permissions (CSV)</span>
              <input type="text" value={scopeForm.denied_permissions} onChange={(e) => setScopeForm({ ...scopeForm, denied_permissions: e.target.value })} />
            </label>
            <div className="enterprise-col-span">
              <button className="enterprise-btn enterprise-btn-secondary" disabled={savingRules}>Save Project Scope</button>
            </div>
          </form>

          <div className="enterprise-list">
            {projectScopes.slice(0, 6).map((scope) => (
              <article key={scope.id} className="enterprise-list-item">
                <p className="enterprise-list-title">{scope.project_name} - {scope.role}</p>
                <p>Allow: {(scope.allowed_permissions || []).join(', ') || '-'}</p>
                <p>Deny: {(scope.denied_permissions || []).join(', ') || '-'}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={BuildingOffice2Icon}
          title="Marketplace and Enablement"
          subtitle="Control app installs and enterprise support programs"
        >
          <div className="enterprise-list">
            {featuredMarketplaceApps.map((item) => {
              const { app } = item;
              const target = getAppLaunchTarget(app);
              return (
                <article key={`featured-${app.id}`} className="enterprise-list-item enterprise-featured-item">
                  <div>
                    <p className="enterprise-list-title">{app.name}</p>
                    <p className="enterprise-featured-meta">{item.meta}</p>
                    <p>{app.description}</p>
                  </div>
                  <div className="enterprise-inline-actions">
                    {app.installed ? (
                      <a
                        href={target.href}
                        target={target.type === 'external' ? '_blank' : undefined}
                        rel={target.type === 'external' ? 'noreferrer' : undefined}
                        className="enterprise-btn enterprise-btn-secondary"
                      >
                        Open
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleMarketplaceApp(app)}
                      className="enterprise-btn enterprise-btn-primary"
                      disabled={busyAppId === app.id}
                    >
                      {busyAppId === app.id ? 'Please wait...' : app.installed ? 'Uninstall' : 'Install'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="enterprise-list">
            {marketplaceApps
              .filter((app) => !['github-advanced-sync', 'incident-ops-feed', 'jira-portfolio-bridge'].includes(app.slug))
              .map((app) => {
              const target = getAppLaunchTarget(app);
              return (
                <article key={app.id} className="enterprise-list-item enterprise-app-item">
                  <div>
                    <p className="enterprise-list-title">{app.name}</p>
                    <p>{app.category} | {app.vendor} | {app.pricing}</p>
                    <p>{app.description}</p>
                  </div>
                  <div className="enterprise-inline-actions">
                    {app.installed ? (
                      <a
                        href={target.href}
                        target={target.type === 'external' ? '_blank' : undefined}
                        rel={target.type === 'external' ? 'noreferrer' : undefined}
                        className="enterprise-btn enterprise-btn-secondary"
                      >
                        Open
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleMarketplaceApp(app)}
                      className="enterprise-btn enterprise-btn-primary"
                      disabled={busyAppId === app.id}
                    >
                      {busyAppId === app.id ? 'Please wait...' : app.installed ? 'Uninstall' : 'Install'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {accountManager?.name ? (
            <article className="enterprise-callout enterprise-top-gap">
              <p className="enterprise-list-title">Account Manager: {accountManager.name}</p>
              <p>{accountManager.email} {accountManager.phone ? `| ${accountManager.phone}` : ''}</p>
              <p>{accountManager.timezone} {accountManager.availability ? `| ${accountManager.availability}` : ''}</p>
            </article>
          ) : null}

          <div className="enterprise-list enterprise-top-gap">
            {trainings.length ? (
              trainings.map((training) => (
                <article key={training.id} className="enterprise-list-item">
                  <div className="enterprise-inline-actions">
                    <p className="enterprise-list-title">{training.title}</p>
                    <span className={`enterprise-badge enterprise-badge-${statusTone(training.status)}`}>
                      {training.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p>{training.description}</p>
                </article>
              ))
            ) : (
              <p className="enterprise-empty">No training programs scheduled.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={ChartBarSquareIcon}
          title="Portfolio and SLA"
          subtitle="Cross-project delivery health and contractual performance"
        >
          {portfolio ? (
            <>
              <div className="enterprise-mini-metrics">
                <MetricCard label="Projects" value={portfolio.totals.projects} />
                <MetricCard label="Issues" value={portfolio.totals.issues} />
                <MetricCard label="Completion" value={`${portfolio.totals.completion_percent}%`} />
                <MetricCard label="Blockers" value={portfolio.totals.active_blockers} />
              </div>
              <div className="enterprise-list enterprise-top-gap">
                {(portfolio.projects || []).slice(0, 6).map((project) => (
                  <article key={project.project_id} className="enterprise-list-item">
                    <p className="enterprise-list-title">{project.project_name}</p>
                    <p>{project.done_count}/{project.issue_count} done | overdue {project.overdue_issues} | blockers {project.active_blockers}</p>
                    <p>Risk score: {project.risk_score}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="enterprise-empty">No portfolio data available.</p>
          )}

          <div className="enterprise-list enterprise-top-gap">
            {slaData.length ? (
              slaData.map((sla) => (
                <article key={sla.id} className="enterprise-list-item">
                  <p className="enterprise-list-title">{sla.metric.replace('_', ' ')}</p>
                  <p>Guaranteed: {sla.guaranteed_value}%</p>
                  <p>Actual: {sla.actual_value || 'N/A'}%</p>
                </article>
              ))
            ) : (
              <p className="enterprise-empty">No SLA data available.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={BoltIcon}
          title="Automation Rules"
          subtitle="Build SLA detection and escalation workflows"
          actions={(
            <button
              type="button"
              className="enterprise-btn enterprise-btn-secondary"
              onClick={runIncidentAutomation}
              disabled={runningAutomation}
            >
              {runningAutomation ? 'Running...' : 'Run Now'}
            </button>
          )}
        >
          <form onSubmit={createSlaRule} className="enterprise-form-grid">
            <label>
              <span>SLA Rule Name</span>
              <input value={slaForm.name} onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })} required />
            </label>
            <label>
              <span>Metric</span>
              <select value={slaForm.metric} onChange={(e) => setSlaForm({ ...slaForm, metric: e.target.value })}>
                <option value="uptime">uptime</option>
                <option value="response_time">response_time</option>
                <option value="resolution_time">resolution_time</option>
                <option value="support_response">support_response</option>
              </select>
            </label>
            <label>
              <span>Threshold %</span>
              <input type="number" step="0.01" value={slaForm.threshold_percent} onChange={(e) => setSlaForm({ ...slaForm, threshold_percent: e.target.value })} />
            </label>
            <label>
              <span>Lookback Days</span>
              <input type="number" value={slaForm.lookback_days} onChange={(e) => setSlaForm({ ...slaForm, lookback_days: e.target.value })} />
            </label>
            <label>
              <span>Severity</span>
              <select value={slaForm.severity} onChange={(e) => setSlaForm({ ...slaForm, severity: e.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <div>
              <button className="enterprise-btn enterprise-btn-primary" disabled={savingRules}>Create SLA Rule</button>
            </div>
          </form>

          <form onSubmit={createEscalationRule} className="enterprise-form-grid enterprise-top-gap">
            <label>
              <span>Escalation Name</span>
              <input value={escalationForm.name} onChange={(e) => setEscalationForm({ ...escalationForm, name: e.target.value })} required />
            </label>
            <label>
              <span>Incident Type</span>
              <select value={escalationForm.incident_type} onChange={(e) => setEscalationForm({ ...escalationForm, incident_type: e.target.value })}>
                <option value="">all</option>
                <option value="sla_risk">sla_risk</option>
                <option value="blocker_spike">blocker_spike</option>
                <option value="delivery_risk">delivery_risk</option>
              </select>
            </label>
            <label>
              <span>Min Severity</span>
              <select value={escalationForm.min_severity} onChange={(e) => setEscalationForm({ ...escalationForm, min_severity: e.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <label>
              <span>Delay (minutes)</span>
              <input type="number" value={escalationForm.escalation_delay_minutes} onChange={(e) => setEscalationForm({ ...escalationForm, escalation_delay_minutes: e.target.value })} />
            </label>
            <label className="enterprise-check"><input type="checkbox" checked={escalationForm.create_task} onChange={(e) => setEscalationForm({ ...escalationForm, create_task: e.target.checked })} /><span>Create task</span></label>
            <label className="enterprise-check"><input type="checkbox" checked={escalationForm.create_blocker} onChange={(e) => setEscalationForm({ ...escalationForm, create_blocker: e.target.checked })} /><span>Create blocker</span></label>
            <div className="enterprise-col-span">
              <button className="enterprise-btn enterprise-btn-primary" disabled={savingRules}>Create Escalation Rule</button>
            </div>
          </form>

          <div className="enterprise-list enterprise-top-gap">
            {slaRules.map((rule) => (
              <article key={rule.id} className="enterprise-list-item">
                <p className="enterprise-list-title">{rule.name}</p>
                <p>{rule.metric} | threshold {rule.threshold_percent}% | {rule.lookback_days}d | {rule.severity}</p>
              </article>
            ))}
            {escalationRules.map((rule) => (
              <article key={rule.id} className="enterprise-list-item">
                <p className="enterprise-list-title">{rule.name}</p>
                <p>{rule.incident_type || 'all'} | min {rule.min_severity} | {rule.escalation_delay_minutes}m</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          icon={ExclamationTriangleIcon}
          title="Incident Feed"
          subtitle="Recent automation and operational risk events"
        >
          <div className="enterprise-list">
            {incidents.length ? (
              incidents.slice(0, 8).map((incident) => (
                <article key={incident.id} className="enterprise-list-item">
                  <div className="enterprise-inline-actions">
                    <p className="enterprise-list-title">{incident.title}</p>
                    <span className={`enterprise-badge enterprise-badge-${statusTone(incident.status)}`}>
                      {incident.status}
                    </span>
                  </div>
                  <p>{incident.incident_type} | severity: {incident.severity}</p>
                  <p>{formatDateTime(incident.created_at)}</p>
                </article>
              ))
            ) : (
              <p className="enterprise-empty">No incidents detected.</p>
            )}
          </div>
        </SectionCard>

        {onPremise?.id ? (
          <SectionCard icon={ServerIcon} title="On-Premise Deployment" subtitle="Self-hosted enterprise installation status">
            <article className="enterprise-callout">
              <p className="enterprise-list-title">Status: {onPremise.status}</p>
              <p>Location: {onPremise.server_location}</p>
            </article>
          </SectionCard>
        ) : null}

        <SectionCard icon={ClockIcon} title="Support and Learning" subtitle="Training and enablement lifecycle">
          <div className="enterprise-list">
            {trainings.length ? (
              trainings.map((training) => (
                <article key={`timeline-${training.id}`} className="enterprise-list-item">
                  <div className="enterprise-inline-actions">
                    <p className="enterprise-list-title">{training.title}</p>
                    <span className={`enterprise-badge enterprise-badge-${statusTone(training.status)}`}>
                      {training.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p>{training.description}</p>
                </article>
              ))
            ) : (
              <p className="enterprise-empty">No active training timeline.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={AcademicCapIcon} title="Training Catalog" subtitle="Knowledge transfer sessions for enterprise teams">
          <div className="enterprise-mini-metrics">
            <MetricCard label="Programs" value={trainings.length} />
            <MetricCard label="Completed" value={trainings.filter((t) => t.status === 'completed').length} />
            <MetricCard label="In Progress" value={trainings.filter((t) => t.status === 'in_progress').length} />
            <MetricCard label="Scheduled" value={trainings.filter((t) => t.status === 'scheduled').length} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
