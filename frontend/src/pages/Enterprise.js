import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import "./Enterprise.css";

const ROLE_OPTIONS = ["admin", "manager", "contributor"];
const PROVIDER_OPTIONS = [
  ["saml", "SAML 2.0"],
  ["okta", "Okta"],
  ["azure", "Azure AD"],
  ["google", "Google Workspace"],
];
const REGION_OPTIONS = [
  ["us", "United States"],
  ["eu", "European Union"],
  ["uk", "United Kingdom"],
  ["ca", "Canada"],
  ["apac", "Asia Pacific"],
];
const TRAINING_STATUS_OPTIONS = [
  ["scheduled", "Scheduled"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];
const SLA_METRIC_OPTIONS = [
  ["uptime", "Uptime"],
  ["response_time", "Response time"],
  ["resolution_time", "Resolution time"],
  ["support_response", "Support response"],
];
const INCIDENT_TYPE_OPTIONS = [
  ["", "All incident types"],
  ["sla_risk", "SLA risk"],
  ["blocker_spike", "Blocker spike"],
  ["delivery_risk", "Delivery risk"],
];
const SEVERITY_OPTIONS = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
  ["critical", "Critical"],
];
const FEATURED_SLUGS = ["github-advanced-sync", "incident-ops-feed", "jira-portfolio-bridge"];

function emptySsoForm() {
  return {
    provider: "saml",
    enabled: false,
    entity_id: "",
    sso_url: "",
    x509_cert: "",
    auto_provision_users: true,
    default_role: "contributor",
  };
}

function emptyComplianceForm() {
  return {
    data_residency_region: "us",
    require_sso: false,
    require_mfa: false,
    audit_export_enabled: true,
    third_party_app_approval_required: true,
    retention_days: 365,
    ip_allowlist: "",
    allowed_integrations: "github, jira, slack",
  };
}

function emptyPermissionForm() {
  return {
    adminAdd: "",
    adminRemove: "",
    managerAdd: "",
    managerRemove: "",
    contributorAdd: "",
    contributorRemove: "",
    require_admin_approval_for_delete: false,
  };
}

function emptyScopeForm() {
  return {
    project_id: "",
    role: "manager",
    allowed_permissions: "create_issue, edit_issue, assign_issue",
    denied_permissions: "",
  };
}

function emptyTrainingForm() {
  return {
    title: "",
    description: "",
    training_date: "",
    duration_hours: 2,
    location: "Remote",
  };
}

function emptyOnPremForm() {
  return {
    server_location: "",
    server_specs: "",
    database_type: "PostgreSQL",
    status: "requested",
    version: "",
    support_email: "",
    support_phone: "",
    notes: "",
  };
}

function emptySlaForm() {
  return {
    name: "Uptime Alert",
    metric: "uptime",
    threshold_percent: 99.9,
    lookback_days: 30,
    severity: "high",
    auto_notify_admins: true,
    auto_create_incident: true,
  };
}

function emptyEscalationForm() {
  return {
    name: "Critical Incident Escalation",
    incident_type: "",
    min_severity: "high",
    escalation_delay_minutes: 0,
    create_task: true,
    create_blocker: false,
    notify_admins: true,
    assign_to_role: "admin",
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCsv(value) {
  return ensureArray(value).join(", ");
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value) {
  return String(value || "N/A")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusTone(status) {
  const tones = {
    open: "danger",
    resolved: "success",
    completed: "success",
    scheduled: "warn",
    in_progress: "info",
    cancelled: "danger",
    requested: "warn",
    deployed: "success",
    maintenance: "warn",
    installed: "success",
  };
  return tones[status] || "info";
}

function getLaunchTarget(app) {
  const launchPath = String(app?.launch_path || "").trim();
  if (launchPath) {
    if (launchPath.startsWith("http://") || launchPath.startsWith("https://")) {
      return { type: "external", href: launchPath };
    }
    return { type: "internal", href: launchPath };
  }
  if (app?.docs_url) return { type: "external", href: app.docs_url };
  return { type: "internal", href: "/enterprise" };
}

function StatusPill({ status }) {
  return <span className={`enterprise-pill enterprise-pill-${statusTone(status)}`}>{formatLabel(status)}</span>;
}

function SignalCard({ tone = "info", title, children }) {
  return (
    <article className={`enterprise-signal enterprise-signal-${tone}`}>
      <p className="enterprise-signal-title">{title}</p>
      <p className="enterprise-signal-body">{children}</p>
    </article>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <article className="enterprise-metric-card">
      <p className="enterprise-metric-label">{label}</p>
      <p className="enterprise-metric-value">{value}</p>
      {helper ? <p className="enterprise-metric-helper">{helper}</p> : null}
    </article>
  );
}

export default function Enterprise() {
  const navigate = useNavigate();
  const { addToast, confirm } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [warningText, setWarningText] = useState("");

  const [showSsoEditor, setShowSsoEditor] = useState(false);
  const [showTrainingComposer, setShowTrainingComposer] = useState(false);
  const [showOnPremEditor, setShowOnPremEditor] = useState(false);

  const [ssoConfig, setSsoConfig] = useState(null);
  const [accountManager, setAccountManager] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [onPremise, setOnPremise] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [permissionPolicy, setPermissionPolicy] = useState(null);
  const [marketplaceApps, setMarketplaceApps] = useState([]);
  const [featuredMarketplace, setFeaturedMarketplace] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectScopes, setProjectScopes] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [escalationRules, setEscalationRules] = useState([]);

  const [ssoForm, setSsoForm] = useState(emptySsoForm);
  const [complianceForm, setComplianceForm] = useState(emptyComplianceForm);
  const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);
  const [scopeForm, setScopeForm] = useState(emptyScopeForm);
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
  const [onPremForm, setOnPremForm] = useState(emptyOnPremForm);
  const [slaForm, setSlaForm] = useState(emptySlaForm);
  const [escalationForm, setEscalationForm] = useState(emptyEscalationForm);

  const pageVars = {
    "--enterprise-border": palette.border,
    "--enterprise-card": palette.cardAlt,
    "--enterprise-card-strong": palette.card,
    "--enterprise-text": palette.text,
    "--enterprise-muted": palette.muted,
    "--enterprise-accent": palette.accent,
    "--enterprise-accent-soft": palette.accentSoft,
    "--enterprise-success": palette.success,
    "--enterprise-warn": palette.warn,
    "--enterprise-danger": palette.danger,
  };

  const inputStyle = ui.input;
  const selectStyle = { ...ui.input, appearance: "none" };
  const textareaStyle = { ...ui.input, minHeight: 96, resize: "vertical" };

  const loadEnterpriseData = useCallback(
    async ({ silent = false } = {}) => {
      setRefreshing(true);
      const results = await Promise.allSettled([
        api.get("/api/organizations/enterprise/sso/"),
        api.get("/api/organizations/enterprise/account-manager/"),
        api.get("/api/organizations/enterprise/training/"),
        api.get("/api/organizations/enterprise/sla/"),
        api.get("/api/organizations/enterprise/on-premise/"),
        api.get("/api/organizations/enterprise/compliance/"),
        api.get("/api/organizations/enterprise/permissions/"),
        api.get("/api/organizations/enterprise/marketplace/apps/"),
        api.get("/api/organizations/enterprise/marketplace/featured/"),
        api.get("/api/organizations/enterprise/portfolio-report/"),
        api.get("/api/organizations/enterprise/incidents/"),
        api.get("/api/agile/projects/"),
        api.get("/api/organizations/enterprise/permissions/project-scopes/"),
        api.get("/api/organizations/enterprise/sla-rules/"),
        api.get("/api/organizations/enterprise/incidents/escalation-rules/"),
      ]);

      const pick = (index, fallback) => {
        const result = results[index];
        return result.status === "fulfilled" ? result.value.data ?? fallback : fallback;
      };

      const ssoData = pick(0, { enabled: false });
      const managerData = pick(1, null);
      const trainingData = ensureArray(pick(2, []));
      const onPremData = pick(4, null);
      const complianceData = pick(5, {});
      const permissionData = pick(6, null);
      const projectData = pick(11, []);
      const failedRequests = results.filter((result) => result.status === "rejected");

      setSsoConfig(ssoData);
      setAccountManager(managerData?.name ? managerData : null);
      setTrainings(trainingData);
      setSlaData(ensureArray(pick(3, [])));
      setOnPremise(onPremData?.id ? onPremData : null);
      setCompliance(complianceData);
      setPermissionPolicy(permissionData);
      setMarketplaceApps(ensureArray(pick(7, [])));
      setFeaturedMarketplace(ensureArray(pick(8, [])));
      setPortfolio(pick(9, null)?.totals ? pick(9, null) : null);
      setIncidents(ensureArray(pick(10, [])));
      setProjects(Array.isArray(projectData) ? projectData : ensureArray(projectData?.results));
      setProjectScopes(ensureArray(pick(12, [])));
      setSlaRules(ensureArray(pick(13, [])));
      setEscalationRules(ensureArray(pick(14, [])));

      setSsoForm({
        ...emptySsoForm(),
        ...ssoData,
        default_role: ssoData?.default_role || "contributor",
      });
      setComplianceForm({
        data_residency_region: complianceData?.data_residency_region || "us",
        require_sso: Boolean(complianceData?.require_sso),
        require_mfa: Boolean(complianceData?.require_mfa),
        audit_export_enabled: Boolean(complianceData?.audit_export_enabled),
        third_party_app_approval_required: Boolean(complianceData?.third_party_app_approval_required),
        retention_days: complianceData?.retention_days || 365,
        ip_allowlist: toCsv(complianceData?.ip_allowlist),
        allowed_integrations: toCsv(complianceData?.allowed_integrations),
      });
      setPermissionForm({
        adminAdd: toCsv(permissionData?.role_overrides?.admin?.add),
        adminRemove: toCsv(permissionData?.role_overrides?.admin?.remove),
        managerAdd: toCsv(permissionData?.role_overrides?.manager?.add),
        managerRemove: toCsv(permissionData?.role_overrides?.manager?.remove),
        contributorAdd: toCsv(permissionData?.role_overrides?.contributor?.add),
        contributorRemove: toCsv(permissionData?.role_overrides?.contributor?.remove),
        require_admin_approval_for_delete: Boolean(permissionData?.require_admin_approval_for_delete),
      });
      if (onPremData?.id) {
        setOnPremForm({
          server_location: onPremData.server_location || "",
          server_specs: onPremData.server_specs || "",
          database_type: onPremData.database_type || "PostgreSQL",
          status: onPremData.status || "requested",
          version: onPremData.version || "",
          support_email: onPremData.support_email || "",
          support_phone: onPremData.support_phone || "",
          notes: onPremData.notes || "",
        });
      }

      setWarningText(failedRequests.length ? "Some enterprise modules failed to load. The page is still usable with the data available." : "");
      if (!silent && failedRequests.length) {
        addToast("Some enterprise data could not be loaded. Showing what is available.", "warning");
      }
      setLoading(false);
      setRefreshing(false);
    },
    [addToast]
  );

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const runAction = async ({ key, request, success, failure, after }) => {
    setBusyKey(key);
    try {
      const response = await request();
      if (success) {
        addToast(typeof success === "function" ? success(response) : success, "success");
      }
      if (after) {
        await after(response);
      }
      return response;
    } catch (error) {
      addToast(error.response?.data?.error || failure || "Something went wrong.", "error");
      return null;
    } finally {
      setBusyKey("");
    }
  };

  const refreshQuietly = async () => {
    await loadEnterpriseData({ silent: true });
  };

  const openMarketplaceApp = (app) => {
    const target = getLaunchTarget(app);
    if (target.type === "external") {
      window.open(target.href, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(target.href);
  };

  const submitSso = async (event) => {
    event.preventDefault();
    await runAction({
      key: "sso",
      request: () =>
        api({
          url: "/api/organizations/enterprise/sso/",
          method: ssoConfig?.id ? "put" : "post",
          data: { ...ssoForm, default_role: ssoForm.default_role || "contributor" },
        }),
      success: "SSO configuration saved.",
      failure: "Unable to save the SSO configuration.",
      after: async () => {
        setShowSsoEditor(false);
        await refreshQuietly();
      },
    });
  };

  const submitCompliance = async (event) => {
    event.preventDefault();
    await runAction({
      key: "compliance",
      request: () =>
        api.put("/api/organizations/enterprise/compliance/", {
          ...complianceForm,
          retention_days: Number(complianceForm.retention_days) || 365,
          ip_allowlist: parseCsv(complianceForm.ip_allowlist),
          allowed_integrations: parseCsv(complianceForm.allowed_integrations),
        }),
      success: "Governance policy updated.",
      failure: "Unable to update the compliance policy.",
      after: refreshQuietly,
    });
  };

  const submitPermissions = async (event) => {
    event.preventDefault();
    await runAction({
      key: "permissions",
      request: () =>
        api.put("/api/organizations/enterprise/permissions/", {
          require_admin_approval_for_delete: permissionForm.require_admin_approval_for_delete,
          role_overrides: {
            admin: { add: parseCsv(permissionForm.adminAdd), remove: parseCsv(permissionForm.adminRemove) },
            manager: { add: parseCsv(permissionForm.managerAdd), remove: parseCsv(permissionForm.managerRemove) },
            contributor: { add: parseCsv(permissionForm.contributorAdd), remove: parseCsv(permissionForm.contributorRemove) },
          },
        }),
      success: "Role permission policy saved.",
      failure: "Unable to update the role permission policy.",
      after: refreshQuietly,
    });
  };

  const submitProjectScope = async (event) => {
    event.preventDefault();
    await runAction({
      key: "scope",
      request: () =>
        api.post("/api/organizations/enterprise/permissions/project-scopes/", {
          project_id: Number(scopeForm.project_id),
          role: scopeForm.role,
          allowed_permissions: parseCsv(scopeForm.allowed_permissions),
          denied_permissions: parseCsv(scopeForm.denied_permissions),
        }),
      success: "Project permission scope saved.",
      failure: "Unable to save the project permission scope.",
      after: async () => {
        setScopeForm(emptyScopeForm());
        await refreshQuietly();
      },
    });
  };

  const submitTraining = async (event) => {
    event.preventDefault();
    await runAction({
      key: "training-create",
      request: () =>
        api.post("/api/organizations/enterprise/training/", {
          ...trainingForm,
          duration_hours: Number(trainingForm.duration_hours) || 2,
        }),
      success: "Training program created.",
      failure: "Unable to create the training program.",
      after: async () => {
        setShowTrainingComposer(false);
        setTrainingForm(emptyTrainingForm());
        await refreshQuietly();
      },
    });
  };

  const updateTrainingStatus = async (training, status) => {
    await runAction({
      key: `training-${training.id}`,
      request: () =>
        api.put(`/api/organizations/enterprise/training/${training.id}/`, {
          status,
          materials_url: training.materials_url || "",
          recording_url: training.recording_url || "",
        }),
      success: `${training.title} updated.`,
      failure: "Unable to update the training program.",
      after: refreshQuietly,
    });
  };

  const submitOnPrem = async (event) => {
    event.preventDefault();
    const isExisting = Boolean(onPremise?.id);
    await runAction({
      key: "on-prem",
      request: () =>
        isExisting
          ? api.put("/api/organizations/enterprise/on-premise/", {
              status: onPremForm.status,
              version: onPremForm.version,
              support_email: onPremForm.support_email,
              support_phone: onPremForm.support_phone,
              notes: onPremForm.notes,
            })
          : api.post("/api/organizations/enterprise/on-premise/", {
              server_location: onPremForm.server_location,
              server_specs: onPremForm.server_specs,
              database_type: onPremForm.database_type,
            }),
      success: isExisting ? "On-prem deployment updated." : "On-prem deployment request submitted.",
      failure: "Unable to update the on-prem deployment.",
      after: async () => {
        setShowOnPremEditor(false);
        await refreshQuietly();
      },
    });
  };

  const toggleMarketplaceApp = async (app) => {
    await runAction({
      key: `app-${app.id}`,
      request: () =>
        app.installed
          ? api.delete(`/api/organizations/enterprise/marketplace/apps/${app.id}/uninstall/`)
          : api.post(`/api/organizations/enterprise/marketplace/apps/${app.id}/install/`, {}),
      success: `${app.name} ${app.installed ? "uninstalled" : "installed"}.`,
      failure: `Unable to ${app.installed ? "uninstall" : "install"} ${app.name}.`,
      after: refreshQuietly,
    });
  };

  const runAutomation = async () => {
    await runAction({
      key: "automation",
      request: () => api.post("/api/organizations/enterprise/incidents/run-automation/", {}),
      success: (response) => `Incident automation finished. ${Number(response.data?.created_count || 0)} incident(s) created.`,
      failure: "Unable to run enterprise incident automation.",
      after: refreshQuietly,
    });
  };

  const submitSlaRule = async (event) => {
    event.preventDefault();
    await runAction({
      key: "sla-create",
      request: () =>
        api.post("/api/organizations/enterprise/sla-rules/", {
          ...slaForm,
          threshold_percent: Number(slaForm.threshold_percent) || 99.9,
          lookback_days: Number(slaForm.lookback_days) || 30,
          enabled: true,
        }),
      success: "SLA rule created.",
      failure: "Unable to create the SLA rule.",
      after: async () => {
        setSlaForm(emptySlaForm());
        await refreshQuietly();
      },
    });
  };

  const toggleSlaRule = async (rule) => {
    await runAction({
      key: `sla-${rule.id}`,
      request: () => api.put(`/api/organizations/enterprise/sla-rules/${rule.id}/`, { enabled: !rule.enabled }),
      success: `${rule.name} ${rule.enabled ? "paused" : "enabled"}.`,
      failure: "Unable to update the SLA rule.",
      after: refreshQuietly,
    });
  };

  const deleteSlaRule = (rule) => {
    confirm(`Delete ${rule.name}?`, async () => {
      await runAction({
        key: `sla-delete-${rule.id}`,
        request: () => api.delete(`/api/organizations/enterprise/sla-rules/${rule.id}/`),
        success: `${rule.name} deleted.`,
        failure: "Unable to delete the SLA rule.",
        after: refreshQuietly,
      });
    });
  };

  const submitEscalationRule = async (event) => {
    event.preventDefault();
    await runAction({
      key: "escalation-create",
      request: () =>
        api.post("/api/organizations/enterprise/incidents/escalation-rules/", {
          ...escalationForm,
          escalation_delay_minutes: Number(escalationForm.escalation_delay_minutes) || 0,
          enabled: true,
        }),
      success: "Escalation rule created.",
      failure: "Unable to create the escalation rule.",
      after: async () => {
        setEscalationForm(emptyEscalationForm());
        await refreshQuietly();
      },
    });
  };

  const toggleEscalationRule = async (rule) => {
    await runAction({
      key: `escalation-${rule.id}`,
      request: () => api.put(`/api/organizations/enterprise/incidents/escalation-rules/${rule.id}/`, { enabled: !rule.enabled }),
      success: `${rule.name} ${rule.enabled ? "paused" : "enabled"}.`,
      failure: "Unable to update the escalation rule.",
      after: refreshQuietly,
    });
  };

  const deleteEscalationRule = (rule) => {
    confirm(`Delete ${rule.name}?`, async () => {
      await runAction({
        key: `escalation-delete-${rule.id}`,
        request: () => api.delete(`/api/organizations/enterprise/incidents/escalation-rules/${rule.id}/`),
        success: `${rule.name} deleted.`,
        failure: "Unable to delete the escalation rule.",
        after: refreshQuietly,
      });
    });
  };

  const portfolioTotals = portfolio?.totals || {};
  const defaultRolePermissions = permissionPolicy?.default_role_permissions || {};
  const openIncidents = incidents.filter((item) => item.status !== "resolved");
  const activePrograms = trainings.filter((item) => ["scheduled", "in_progress"].includes(item.status));
  const installedApps = marketplaceApps.filter((item) => item.installed);
  const controlCoverage = [
    complianceForm.require_sso,
    complianceForm.require_mfa,
    complianceForm.audit_export_enabled,
    complianceForm.third_party_app_approval_required,
  ].filter(Boolean).length;
  const featuredApps = featuredMarketplace.length
    ? featuredMarketplace
    : FEATURED_SLUGS.map((slug) => marketplaceApps.find((item) => item.slug === slug)).filter(Boolean);
  const catalogApps = marketplaceApps.filter((item) => !FEATURED_SLUGS.includes(item.slug));

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <WorkspacePanel
          palette={palette}
          eyebrow="Enterprise"
          title="Loading enterprise control room"
          description="Pulling identity, governance, and operational signals together."
          minHeight={280}
        />
      </div>
    );
  }

  return (
    <div className="enterprise-shell" style={pageVars}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Enterprise Console"
        title="Enterprise operations should feel like a control room, not a stack of admin forms."
        description="Run identity, compliance, marketplace approvals, rollout enablement, and escalation logic from one calmer enterprise workspace."
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => setShowSsoEditor((value) => !value)} style={ui.primaryButton}>
              <LockClosedIcon style={{ width: 14, height: 14 }} />
              {showSsoEditor ? "Close SSO Editor" : ssoConfig?.enabled ? "Adjust SSO" : "Configure SSO"}
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              type="button"
              onClick={runAutomation}
              disabled={busyKey === "automation"}
              style={{ ...ui.secondaryButton, opacity: busyKey === "automation" ? 0.7 : 1 }}
            >
              {busyKey === "automation" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <BoltIcon style={{ width: 14, height: 14 }} />}
              {busyKey === "automation" ? "Running automation" : "Run Incident Automation"}
            </button>
            <Link className="ui-btn-polish ui-focus-ring" to="/security-annex" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
              <ShieldCheckIcon style={{ width: 14, height: 14 }} />
              Security Annex
            </Link>
          </>
        }
        stats={[
          {
            label: "Identity",
            value: ssoConfig?.enabled ? formatLabel(ssoConfig.provider) : "Manual",
            helper: ssoConfig?.enabled ? "SSO is live." : "SSO is not configured yet.",
            tone: ssoConfig?.enabled ? palette.success : palette.warn,
          },
          {
            label: "Controls",
            value: `${controlCoverage}/4`,
            helper: "Core governance flags enabled.",
            tone: palette.accent,
          },
          {
            label: "Incidents",
            value: openIncidents.length,
            helper: openIncidents.length ? "Unresolved enterprise incidents." : "No active incidents.",
            tone: openIncidents.length ? palette.danger : palette.success,
          },
          {
            label: "Installed Apps",
            value: installedApps.length,
            helper: `${marketplaceApps.length} marketplace apps available.`,
            tone: palette.text,
          },
        ]}
        aside={
          <div className="enterprise-callout">
            <p className="enterprise-eyebrow">Rollout Partner</p>
            <p className="enterprise-callout-title">{accountManager?.name || "Enterprise support lane ready"}</p>
            <p className="enterprise-callout-text">
              {accountManager?.email
                ? `${accountManager.email}${accountManager.phone ? ` | ${accountManager.phone}` : ""}`
                : "Assign support ownership and rollout planning as governance requirements become more formal."}
            </p>
            <Link className="ui-btn-polish ui-focus-ring" to="/subscription" style={{ ...ui.secondaryButton, textDecoration: "none", justifyContent: "center" }}>
              <SparklesIcon style={{ width: 14, height: 14 }} />
              Pricing & Upgrade
            </Link>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div className="enterprise-signal-grid">
          <SignalCard tone={ssoConfig?.enabled ? "success" : "warn"} title={ssoConfig?.enabled ? "Identity Ready" : "Identity Gap"}>
            {ssoConfig?.enabled
              ? `${formatLabel(ssoConfig.provider)} is active with ${formatLabel(ssoConfig.default_role || "contributor")} as the default role.`
              : "Single sign-on is still manual. Move identity out of ad hoc onboarding when the workspace is ready."}
          </SignalCard>
          <SignalCard tone={complianceForm.third_party_app_approval_required ? "info" : "warn"} title="App Governance">
            {complianceForm.third_party_app_approval_required
              ? "Third-party marketplace installs require approval by policy."
              : "Marketplace approval guardrails are off. Review app governance before scaling adoption."}
          </SignalCard>
          <SignalCard tone={openIncidents.length ? "danger" : "success"} title="Incident Radar">
            {openIncidents.length
              ? `${openIncidents.length} enterprise incident(s) are currently open across blocker, delivery, or SLA flows.`
              : "No unresolved enterprise incidents are active right now."}
          </SignalCard>
          <SignalCard tone={activePrograms.length ? "info" : "warn"} title="Enablement">
            {activePrograms.length
              ? `${activePrograms.length} rollout or training program(s) are active.`
              : "No active rollout programs are scheduled yet."}
          </SignalCard>
        </div>
        {warningText ? <div className="enterprise-warning">{warningText}</div> : null}
      </WorkspaceToolbar>

      <div className="enterprise-main-grid">
        <WorkspacePanel
          palette={palette}
          eyebrow="Governance"
          title="Identity and compliance"
          description="Keep identity, residency, retention, and app approval policy visible in one editorial surface."
          action={
            <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => loadEnterpriseData({ silent: true })} disabled={refreshing} style={ui.secondaryButton}>
              {refreshing ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
              Refresh
            </button>
          }
        >
          <div className="enterprise-metric-grid">
            <MetricCard label="Residency" value={formatLabel(complianceForm.data_residency_region)} helper="Selected data region." />
            <MetricCard label="Retention" value={`${complianceForm.retention_days}d`} helper="Current retention horizon." />
            <MetricCard label="Audit Exports" value={complianceForm.audit_export_enabled ? "Enabled" : "Off"} helper="Data portability posture." />
          </div>

          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div>
                <h3>SSO posture</h3>
                <p>
                  {ssoConfig?.enabled
                    ? `${formatLabel(ssoConfig.provider)} is active. Auto-provisioning is ${ssoConfig.auto_provision_users ? "enabled" : "disabled"}.`
                    : "SSO is not configured yet. Keep using manual sign-in or move into a managed identity flow."}
                </p>
              </div>
              <StatusPill status={ssoConfig?.enabled ? "installed" : "requested"} />
            </div>
            <div className="enterprise-info-grid">
              <div className="enterprise-info-cell">
                <span>Provider</span>
                <strong>{formatLabel(ssoConfig?.provider || "manual")}</strong>
              </div>
              <div className="enterprise-info-cell">
                <span>Default Role</span>
                <strong>{formatLabel(ssoConfig?.default_role || "contributor")}</strong>
              </div>
              <div className="enterprise-info-cell enterprise-info-cell-wide">
                <span>Entity ID</span>
                <strong>{ssoConfig?.entity_id || "Not configured"}</strong>
              </div>
            </div>
            {showSsoEditor ? (
              <form onSubmit={submitSso} className="enterprise-form-stack">
                <div className="enterprise-form-grid">
                  <label className="enterprise-field">
                    <span>Provider</span>
                    <select value={ssoForm.provider} onChange={(event) => setSsoForm((current) => ({ ...current, provider: event.target.value }))} style={selectStyle}>
                      {PROVIDER_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="enterprise-field">
                    <span>Default role</span>
                    <select value={ssoForm.default_role} onChange={(event) => setSsoForm((current) => ({ ...current, default_role: event.target.value }))} style={selectStyle}>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {formatLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="enterprise-form-grid">
                  <label className="enterprise-field">
                    <span>Entity ID</span>
                    <input type="text" value={ssoForm.entity_id} onChange={(event) => setSsoForm((current) => ({ ...current, entity_id: event.target.value }))} style={inputStyle} />
                  </label>
                  <label className="enterprise-field">
                    <span>SSO URL</span>
                    <input type="url" value={ssoForm.sso_url} onChange={(event) => setSsoForm((current) => ({ ...current, sso_url: event.target.value }))} style={inputStyle} />
                  </label>
                </div>
                <label className="enterprise-field">
                  <span>X.509 certificate</span>
                  <textarea rows="4" value={ssoForm.x509_cert} onChange={(event) => setSsoForm((current) => ({ ...current, x509_cert: event.target.value }))} style={textareaStyle} />
                </label>
                <label className="enterprise-check">
                  <input type="checkbox" checked={ssoForm.enabled} onChange={(event) => setSsoForm((current) => ({ ...current, enabled: event.target.checked }))} />
                  <span>Enable SSO for the workspace</span>
                </label>
                <label className="enterprise-check">
                  <input type="checkbox" checked={ssoForm.auto_provision_users} onChange={(event) => setSsoForm((current) => ({ ...current, auto_provision_users: event.target.checked }))} />
                  <span>Auto-provision users after successful sign-in</span>
                </label>
                <div className="enterprise-inline-actions">
                  <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "sso"} style={{ ...ui.primaryButton, opacity: busyKey === "sso" ? 0.7 : 1 }}>
                    {busyKey === "sso" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                    Save SSO Configuration
                  </button>
                  <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => setShowSsoEditor(false)} style={ui.secondaryButton}>
                    Close
                  </button>
                </div>
              </form>
            ) : null}
          </div>
          <form onSubmit={submitCompliance} className="enterprise-card enterprise-form-stack">
            <div className="enterprise-card-header">
              <div>
                <h3>Governance policy</h3>
                <p>Retention, SSO, MFA, allowlists, and integration approval live in one policy layer.</p>
              </div>
              <span className="enterprise-meta-text">Updated {formatDateTime(compliance?.updated_at)}</span>
            </div>
            <div className="enterprise-form-grid">
              <label className="enterprise-field">
                <span>Data residency</span>
                <select value={complianceForm.data_residency_region} onChange={(event) => setComplianceForm((current) => ({ ...current, data_residency_region: event.target.value }))} style={selectStyle}>
                  {REGION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="enterprise-field">
                <span>Retention days</span>
                <input type="number" min="30" value={complianceForm.retention_days} onChange={(event) => setComplianceForm((current) => ({ ...current, retention_days: event.target.value }))} style={inputStyle} />
              </label>
            </div>
            <label className="enterprise-field">
              <span>IP allowlist</span>
              <input type="text" value={complianceForm.ip_allowlist} onChange={(event) => setComplianceForm((current) => ({ ...current, ip_allowlist: event.target.value }))} style={inputStyle} placeholder="203.0.113.10, 198.51.100.24" />
            </label>
            <label className="enterprise-field">
              <span>Allowed integrations</span>
              <input type="text" value={complianceForm.allowed_integrations} onChange={(event) => setComplianceForm((current) => ({ ...current, allowed_integrations: event.target.value }))} style={inputStyle} placeholder="github, jira, slack" />
            </label>
            <label className="enterprise-check">
              <input type="checkbox" checked={complianceForm.require_sso} onChange={(event) => setComplianceForm((current) => ({ ...current, require_sso: event.target.checked }))} />
              <span>Require SSO</span>
            </label>
            <label className="enterprise-check">
              <input type="checkbox" checked={complianceForm.require_mfa} onChange={(event) => setComplianceForm((current) => ({ ...current, require_mfa: event.target.checked }))} />
              <span>Require MFA</span>
            </label>
            <label className="enterprise-check">
              <input type="checkbox" checked={complianceForm.audit_export_enabled} onChange={(event) => setComplianceForm((current) => ({ ...current, audit_export_enabled: event.target.checked }))} />
              <span>Enable audit exports</span>
            </label>
            <label className="enterprise-check">
              <input type="checkbox" checked={complianceForm.third_party_app_approval_required} onChange={(event) => setComplianceForm((current) => ({ ...current, third_party_app_approval_required: event.target.checked }))} />
              <span>Require approval before third-party app installs</span>
            </label>
            <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "compliance"} style={{ ...ui.primaryButton, justifyContent: "center", opacity: busyKey === "compliance" ? 0.7 : 1 }}>
              {busyKey === "compliance" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
              Save Governance Policy
            </button>
          </form>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Rollout"
          title="Support, training, and deployment"
          description="Run enablement with a real support lane, scheduled training, and a self-hosted deployment track."
          action={
            <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => setShowTrainingComposer((value) => !value)} style={ui.secondaryButton}>
              <AcademicCapIcon style={{ width: 14, height: 14 }} />
              {showTrainingComposer ? "Close Composer" : "Add Training"}
            </button>
          }
        >
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div>
                <h3>{accountManager?.name || "No account manager assigned"}</h3>
                <p>
                  {accountManager?.email
                    ? `${accountManager.email}${accountManager.phone ? ` | ${accountManager.phone}` : ""}`
                    : "Support ownership has not been assigned yet for this workspace."}
                </p>
              </div>
              <UserCircleIcon className="enterprise-panel-icon" />
            </div>
            <div className="enterprise-support-meta">
              <span>{accountManager?.timezone || "Timezone TBD"}</span>
              <span>{accountManager?.availability || "Availability not shared yet"}</span>
            </div>
          </div>

          <div className="enterprise-metric-grid">
            <MetricCard label="Programs" value={trainings.length} helper="Training programs in the rollout lane." />
            <MetricCard label="Active" value={activePrograms.length} helper="Programs currently running." />
            <MetricCard label="On-Prem" value={onPremise?.id ? formatLabel(onPremise.status) : "Not Requested"} helper={onPremise?.id ? "Self-hosted deployment exists." : "No self-hosting request yet."} />
          </div>

          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div>
                <h3>On-premise deployment</h3>
                <p>
                  {onPremise?.id
                    ? `Self-hosted deployment is ${formatLabel(onPremise.status)} in ${onPremise.server_location || "an unspecified location"}.`
                    : "Request a self-hosted deployment when residency or infrastructure requirements demand it."}
                </p>
              </div>
              <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => setShowOnPremEditor((value) => !value)} style={ui.secondaryButton}>
                <ServerIcon style={{ width: 14, height: 14 }} />
                {showOnPremEditor ? "Close Editor" : onPremise?.id ? "Update Deployment" : "Request Deployment"}
              </button>
            </div>
            {onPremise?.id ? (
              <div className="enterprise-info-grid">
                <div className="enterprise-info-cell">
                  <span>Location</span>
                  <strong>{onPremise.server_location || "Not set"}</strong>
                </div>
                <div className="enterprise-info-cell">
                  <span>Database</span>
                  <strong>{onPremise.database_type || "Not set"}</strong>
                </div>
                <div className="enterprise-info-cell">
                  <span>Version</span>
                  <strong>{onPremise.version || "Pending"}</strong>
                </div>
                <div className="enterprise-info-cell">
                  <span>Last Update</span>
                  <strong>{formatDate(onPremise.last_update)}</strong>
                </div>
              </div>
            ) : null}
            {showOnPremEditor ? (
              <form onSubmit={submitOnPrem} className="enterprise-form-stack">
                <div className="enterprise-form-grid">
                  <label className="enterprise-field">
                    <span>Server location</span>
                    <input type="text" value={onPremForm.server_location} onChange={(event) => setOnPremForm((current) => ({ ...current, server_location: event.target.value }))} style={inputStyle} disabled={Boolean(onPremise?.id)} required={!onPremise?.id} />
                  </label>
                  <label className="enterprise-field">
                    <span>Database</span>
                    <input type="text" value={onPremForm.database_type} onChange={(event) => setOnPremForm((current) => ({ ...current, database_type: event.target.value }))} style={inputStyle} disabled={Boolean(onPremise?.id)} />
                  </label>
                </div>
                {!onPremise?.id ? (
                  <label className="enterprise-field">
                    <span>Server specs</span>
                    <textarea rows="4" value={onPremForm.server_specs} onChange={(event) => setOnPremForm((current) => ({ ...current, server_specs: event.target.value }))} style={textareaStyle} />
                  </label>
                ) : (
                  <>
                    <div className="enterprise-form-grid">
                      <label className="enterprise-field">
                        <span>Status</span>
                        <select value={onPremForm.status} onChange={(event) => setOnPremForm((current) => ({ ...current, status: event.target.value }))} style={selectStyle}>
                          {["requested", "deployed", "maintenance"].map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="enterprise-field">
                        <span>Version</span>
                        <input type="text" value={onPremForm.version} onChange={(event) => setOnPremForm((current) => ({ ...current, version: event.target.value }))} style={inputStyle} />
                      </label>
                    </div>
                    <div className="enterprise-form-grid">
                      <label className="enterprise-field">
                        <span>Support email</span>
                        <input type="email" value={onPremForm.support_email} onChange={(event) => setOnPremForm((current) => ({ ...current, support_email: event.target.value }))} style={inputStyle} />
                      </label>
                      <label className="enterprise-field">
                        <span>Support phone</span>
                        <input type="text" value={onPremForm.support_phone} onChange={(event) => setOnPremForm((current) => ({ ...current, support_phone: event.target.value }))} style={inputStyle} />
                      </label>
                    </div>
                    <label className="enterprise-field">
                      <span>Notes</span>
                      <textarea rows="4" value={onPremForm.notes} onChange={(event) => setOnPremForm((current) => ({ ...current, notes: event.target.value }))} style={textareaStyle} />
                    </label>
                  </>
                )}
                <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "on-prem"} style={{ ...ui.primaryButton, justifyContent: "center", opacity: busyKey === "on-prem" ? 0.7 : 1 }}>
                  {busyKey === "on-prem" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                  {onPremise?.id ? "Save Deployment Update" : "Submit Deployment Request"}
                </button>
              </form>
            ) : null}
          </div>

          {showTrainingComposer ? (
            <form onSubmit={submitTraining} className="enterprise-card enterprise-form-stack">
              <div className="enterprise-card-header">
                <div>
                  <h3>Create training program</h3>
                  <p>Support rollout, procurement handoff, or enterprise admin onboarding with a structured enablement session.</p>
                </div>
                <AcademicCapIcon className="enterprise-panel-icon" />
              </div>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Program title</span>
                  <input type="text" value={trainingForm.title} onChange={(event) => setTrainingForm((current) => ({ ...current, title: event.target.value }))} style={inputStyle} required />
                </label>
                <label className="enterprise-field">
                  <span>Training date</span>
                  <input type="datetime-local" value={trainingForm.training_date} onChange={(event) => setTrainingForm((current) => ({ ...current, training_date: event.target.value }))} style={inputStyle} required />
                </label>
              </div>
              <label className="enterprise-field">
                <span>Description</span>
                <textarea rows="4" value={trainingForm.description} onChange={(event) => setTrainingForm((current) => ({ ...current, description: event.target.value }))} style={textareaStyle} />
              </label>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Duration hours</span>
                  <input type="number" min="1" value={trainingForm.duration_hours} onChange={(event) => setTrainingForm((current) => ({ ...current, duration_hours: event.target.value }))} style={inputStyle} />
                </label>
                <label className="enterprise-field">
                  <span>Location</span>
                  <input type="text" value={trainingForm.location} onChange={(event) => setTrainingForm((current) => ({ ...current, location: event.target.value }))} style={inputStyle} />
                </label>
              </div>
              <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "training-create"} style={{ ...ui.primaryButton, justifyContent: "center", opacity: busyKey === "training-create" ? 0.7 : 1 }}>
                {busyKey === "training-create" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                Create Training Program
              </button>
            </form>
          ) : null}

          {trainings.length ? (
            <div className="enterprise-list">
              {trainings.map((training) => (
                <article key={training.id} className="enterprise-list-card">
                  <div className="enterprise-card-header">
                    <div>
                      <h3>{training.title}</h3>
                      <p>{training.description || "No training brief yet."}</p>
                    </div>
                    <StatusPill status={training.status} />
                  </div>
                  <div className="enterprise-info-grid">
                    <div className="enterprise-info-cell">
                      <span>Date</span>
                      <strong>{formatDateTime(training.training_date)}</strong>
                    </div>
                    <div className="enterprise-info-cell">
                      <span>Location</span>
                      <strong>{training.location || "Remote"}</strong>
                    </div>
                    <div className="enterprise-info-cell">
                      <span>Attendees</span>
                      <strong>{training.attendee_count || 0}</strong>
                    </div>
                  </div>
                  <div className="enterprise-inline-actions enterprise-inline-actions-spread">
                    <select value={training.status} onChange={(event) => updateTrainingStatus(training, event.target.value)} style={{ ...selectStyle, width: 170 }} disabled={busyKey === `training-${training.id}`}>
                      {TRAINING_STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <div className="enterprise-inline-actions">
                      {training.materials_url ? (
                        <a href={training.materials_url} target="_blank" rel="noreferrer" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                          Materials
                        </a>
                      ) : null}
                      {training.recording_url ? (
                        <a href={training.recording_url} target="_blank" rel="noreferrer" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                          Recording
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState palette={palette} title="No training programs yet" description="Create the first enablement session for enterprise onboarding or rollout." action={<button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => setShowTrainingComposer(true)} style={ui.primaryButton}><AcademicCapIcon style={{ width: 14, height: 14 }} />Add Program</button>} />
          )}
        </WorkspacePanel>
      </div>

      <div className="enterprise-main-grid">
        <WorkspacePanel
          palette={palette}
          eyebrow="Access Studio"
          title="Role policy and project scopes"
          description="Keep the organization-wide permission baseline visible, then narrow or widen access on specific projects when enterprise governance needs it."
        >
          <form onSubmit={submitPermissions} className="enterprise-form-stack">
            <div className="enterprise-role-grid">
              {ROLE_OPTIONS.map((role) => (
                <article key={role} className="enterprise-card">
                  <div className="enterprise-card-header">
                    <div>
                      <h3>{formatLabel(role)}</h3>
                      <p>Default permissions: {ensureArray(defaultRolePermissions[role]).length}</p>
                    </div>
                    <UserGroupIcon className="enterprise-panel-icon" />
                  </div>
                  <label className="enterprise-field">
                    <span>Add permissions</span>
                    <textarea rows="3" value={permissionForm[`${role}Add`]} onChange={(event) => setPermissionForm((current) => ({ ...current, [`${role}Add`]: event.target.value }))} style={textareaStyle} placeholder="export_data, view_audit_logs" />
                  </label>
                  <label className="enterprise-field">
                    <span>Remove permissions</span>
                    <textarea rows="3" value={permissionForm[`${role}Remove`]} onChange={(event) => setPermissionForm((current) => ({ ...current, [`${role}Remove`]: event.target.value }))} style={textareaStyle} placeholder="delete_issue" />
                  </label>
                </article>
              ))}
            </div>
            <label className="enterprise-check">
              <input type="checkbox" checked={permissionForm.require_admin_approval_for_delete} onChange={(event) => setPermissionForm((current) => ({ ...current, require_admin_approval_for_delete: event.target.checked }))} />
              <span>Require admin approval for delete operations</span>
            </label>
            <div className="enterprise-inline-actions enterprise-inline-actions-spread">
              <span className="enterprise-meta-text">Available permissions: {ensureArray(permissionPolicy?.available_permissions).length}</span>
              <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "permissions"} style={{ ...ui.primaryButton, opacity: busyKey === "permissions" ? 0.7 : 1 }}>
                {busyKey === "permissions" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                Save Role Policy
              </button>
            </div>
          </form>

          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div>
                <h3>Project-specific scopes</h3>
                <p>Override a role on one project without changing the global organization baseline.</p>
              </div>
              <Squares2X2Icon className="enterprise-panel-icon" />
            </div>
            <form onSubmit={submitProjectScope} className="enterprise-form-stack">
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Project</span>
                  <select value={scopeForm.project_id} onChange={(event) => setScopeForm((current) => ({ ...current, project_id: event.target.value }))} style={selectStyle} required>
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="enterprise-field">
                  <span>Role</span>
                  <select value={scopeForm.role} onChange={(event) => setScopeForm((current) => ({ ...current, role: event.target.value }))} style={selectStyle}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {formatLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="enterprise-field">
                <span>Allowed permissions</span>
                <input type="text" value={scopeForm.allowed_permissions} onChange={(event) => setScopeForm((current) => ({ ...current, allowed_permissions: event.target.value }))} style={inputStyle} placeholder="create_issue, edit_issue, assign_issue" />
              </label>
              <label className="enterprise-field">
                <span>Denied permissions</span>
                <input type="text" value={scopeForm.denied_permissions} onChange={(event) => setScopeForm((current) => ({ ...current, denied_permissions: event.target.value }))} style={inputStyle} placeholder="delete_issue" />
              </label>
              <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "scope"} style={{ ...ui.secondaryButton, justifyContent: "center", opacity: busyKey === "scope" ? 0.7 : 1 }}>
                {busyKey === "scope" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                Save Project Scope
              </button>
            </form>
            {projectScopes.length ? (
              <div className="enterprise-list">
                {projectScopes.slice(0, 8).map((scope) => (
                  <article key={scope.id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>
                          {scope.project_name} - {formatLabel(scope.role)}
                        </h3>
                        <p>{scope.project_key} | Updated {formatDateTime(scope.updated_at)}</p>
                      </div>
                    </div>
                    <p className="enterprise-list-meta">Allow: {ensureArray(scope.allowed_permissions).join(", ") || "-"}</p>
                    <p className="enterprise-list-meta">Deny: {ensureArray(scope.denied_permissions).join(", ") || "-"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No scoped permission overrides yet" description="Create the first project-level override when one workspace area needs different guardrails." />
            )}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          palette={palette}
          eyebrow="Marketplace"
          title="Apps and enterprise extensions"
          description="Launch installed tools or add curated extensions that deepen enterprise incident, delivery, and integration workflows."
        >
          {featuredApps.length ? (
            <div className="enterprise-featured-grid">
              {featuredApps.map((app) => (
                <article key={`featured-${app.id}`} className="enterprise-card">
                  <div className="enterprise-card-header">
                    <div>
                      <h3>{app.name}</h3>
                      <p>
                        {formatLabel(app.category)} | {app.vendor} | {formatLabel(app.pricing)}
                      </p>
                    </div>
                    {app.installed ? <StatusPill status="installed" /> : null}
                  </div>
                  <p className="enterprise-body-copy">{app.description}</p>
                  <div className="enterprise-inline-actions">
                    {app.installed ? (
                      <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => openMarketplaceApp(app)} style={ui.secondaryButton}>
                        <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
                        Open
                      </button>
                    ) : null}
                    <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => toggleMarketplaceApp(app)} disabled={busyKey === `app-${app.id}`} style={{ ...ui.primaryButton, opacity: busyKey === `app-${app.id}` ? 0.7 : 1 }}>
                      {busyKey === `app-${app.id}` ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                      {app.installed ? "Uninstall" : "Install"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {catalogApps.length ? (
            <div className="enterprise-list">
              {catalogApps.map((app) => (
                <article key={app.id} className="enterprise-list-card">
                  <div className="enterprise-card-header">
                    <div>
                      <h3>{app.name}</h3>
                      <p>
                        {formatLabel(app.category)} | {app.vendor} | {formatLabel(app.pricing)}
                      </p>
                    </div>
                    {app.status ? <StatusPill status={app.status} /> : null}
                  </div>
                  <p className="enterprise-body-copy">{app.description}</p>
                  <div className="enterprise-inline-actions enterprise-inline-actions-spread">
                    <div className="enterprise-inline-actions">
                      {app.docs_url ? (
                        <a href={app.docs_url} target="_blank" rel="noreferrer" className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, textDecoration: "none" }}>
                          Documentation
                        </a>
                      ) : null}
                      {app.installed ? (
                        <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => openMarketplaceApp(app)} style={ui.secondaryButton}>
                          <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
                          Open
                        </button>
                      ) : null}
                    </div>
                    <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => toggleMarketplaceApp(app)} disabled={busyKey === `app-${app.id}`} style={{ ...ui.primaryButton, opacity: busyKey === `app-${app.id}` ? 0.7 : 1 }}>
                      {busyKey === `app-${app.id}` ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                      {app.installed ? "Uninstall" : "Install"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <WorkspaceEmptyState palette={palette} title="No marketplace apps available" description="The curated enterprise extensions have not been seeded for this workspace yet." />
          )}
        </WorkspacePanel>
      </div>

      <div className="enterprise-main-grid">
        <WorkspacePanel
          palette={palette}
          eyebrow="Operational Radar"
          title="Portfolio, SLA, and incidents"
          description="Track portfolio health, SLA performance, and incident signal in one calmer operations view."
          action={
            <button className="ui-btn-polish ui-focus-ring" type="button" onClick={runAutomation} disabled={busyKey === "automation"} style={{ ...ui.primaryButton, opacity: busyKey === "automation" ? 0.7 : 1 }}>
              {busyKey === "automation" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <BoltIcon style={{ width: 14, height: 14 }} />}
              {busyKey === "automation" ? "Running" : "Run Now"}
            </button>
          }
        >
          {portfolio ? (
            <>
              <div className="enterprise-metric-grid">
                <MetricCard label="Projects" value={portfolioTotals.projects || 0} helper="Projects in the portfolio report." />
                <MetricCard label="Completion" value={`${portfolioTotals.completion_percent || 0}%`} helper={`${portfolioTotals.done || 0} of ${portfolioTotals.issues || 0} issues complete.`} />
                <MetricCard label="Blockers" value={portfolioTotals.active_blockers || 0} helper={`${portfolioTotals.dependency_blockers || 0} dependency blockers.`} />
              </div>
              <div className="enterprise-list">
                {ensureArray(portfolio.projects).slice(0, 6).map((project) => (
                  <article key={project.project_id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>{project.project_name}</h3>
                        <p>
                          {project.done_count}/{project.issue_count} done | {project.overdue_issues} overdue | {project.active_blockers} blockers
                        </p>
                      </div>
                      <div className="enterprise-risk-score">
                        <span>Risk</span>
                        <strong>{project.risk_score}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <WorkspaceEmptyState palette={palette} title="No portfolio report yet" description="Portfolio health appears here once execution data exists for the workspace." />
          )}

          <div className="enterprise-section-block">
            <div className="enterprise-block-head">
              <h3>Incident feed</h3>
              <span>{openIncidents.length} open</span>
            </div>
            {incidents.length ? (
              <div className="enterprise-list">
                {incidents.slice(0, 8).map((incident) => (
                  <article key={incident.id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>{incident.title}</h3>
                        <p>
                          {formatLabel(incident.incident_type)} | {formatLabel(incident.severity)} | {formatDateTime(incident.created_at)}
                        </p>
                      </div>
                      <StatusPill status={incident.status} />
                    </div>
                    <p className="enterprise-body-copy">{incident.description || "No incident detail available."}</p>
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No enterprise incidents" description="Automation has not opened any enterprise incidents yet." />
            )}
          </div>

          <div className="enterprise-section-block">
            <div className="enterprise-block-head">
              <h3>SLA performance</h3>
              <span>{slaData.length} metric(s)</span>
            </div>
            {slaData.length ? (
              <div className="enterprise-list">
                {slaData.map((item) => (
                  <article key={item.id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>{formatLabel(item.metric)}</h3>
                        <p>
                          {formatDate(item.period_start)} - {formatDate(item.period_end)}
                        </p>
                      </div>
                      <StatusPill status={item.met ? "completed" : "open"} />
                    </div>
                    <p className="enterprise-list-meta">
                      Guaranteed {item.guaranteed_value}% | Actual {item.actual_value ?? "N/A"}%
                    </p>
                    {item.notes ? <p className="enterprise-body-copy">{item.notes}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No SLA measurements yet" description="SLA performance appears once guarantees exist for the organization." />
            )}
          </div>
        </WorkspacePanel>
        <WorkspacePanel
          palette={palette}
          eyebrow="Rule Studio"
          title="Detection and escalation rules"
          description="Define how SLA drift and enterprise incidents should turn into notifications, incidents, blockers, and follow-up work."
        >
          <div className="enterprise-rule-grid">
            <form onSubmit={submitSlaRule} className="enterprise-card enterprise-form-stack">
              <div className="enterprise-card-header">
                <div>
                  <h3>Create SLA rule</h3>
                  <p>Watch a threshold, then notify admins or create incidents automatically.</p>
                </div>
                <CheckCircleIcon className="enterprise-panel-icon" />
              </div>
              <label className="enterprise-field">
                <span>Name</span>
                <input type="text" value={slaForm.name} onChange={(event) => setSlaForm((current) => ({ ...current, name: event.target.value }))} style={inputStyle} required />
              </label>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Metric</span>
                  <select value={slaForm.metric} onChange={(event) => setSlaForm((current) => ({ ...current, metric: event.target.value }))} style={selectStyle}>
                    {SLA_METRIC_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="enterprise-field">
                  <span>Severity</span>
                  <select value={slaForm.severity} onChange={(event) => setSlaForm((current) => ({ ...current, severity: event.target.value }))} style={selectStyle}>
                    {SEVERITY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Threshold %</span>
                  <input type="number" step="0.01" value={slaForm.threshold_percent} onChange={(event) => setSlaForm((current) => ({ ...current, threshold_percent: event.target.value }))} style={inputStyle} />
                </label>
                <label className="enterprise-field">
                  <span>Lookback days</span>
                  <input type="number" min="1" value={slaForm.lookback_days} onChange={(event) => setSlaForm((current) => ({ ...current, lookback_days: event.target.value }))} style={inputStyle} />
                </label>
              </div>
              <label className="enterprise-check">
                <input type="checkbox" checked={slaForm.auto_notify_admins} onChange={(event) => setSlaForm((current) => ({ ...current, auto_notify_admins: event.target.checked }))} />
                <span>Notify admins automatically</span>
              </label>
              <label className="enterprise-check">
                <input type="checkbox" checked={slaForm.auto_create_incident} onChange={(event) => setSlaForm((current) => ({ ...current, auto_create_incident: event.target.checked }))} />
                <span>Create incidents automatically</span>
              </label>
              <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "sla-create"} style={{ ...ui.primaryButton, justifyContent: "center", opacity: busyKey === "sla-create" ? 0.7 : 1 }}>
                {busyKey === "sla-create" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                Create SLA Rule
              </button>
            </form>

            <form onSubmit={submitEscalationRule} className="enterprise-card enterprise-form-stack">
              <div className="enterprise-card-header">
                <div>
                  <h3>Create escalation rule</h3>
                  <p>Decide which incident classes should create tasks, blockers, or admin notifications.</p>
                </div>
                <ExclamationTriangleIcon className="enterprise-panel-icon" />
              </div>
              <label className="enterprise-field">
                <span>Name</span>
                <input type="text" value={escalationForm.name} onChange={(event) => setEscalationForm((current) => ({ ...current, name: event.target.value }))} style={inputStyle} required />
              </label>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Incident type</span>
                  <select value={escalationForm.incident_type} onChange={(event) => setEscalationForm((current) => ({ ...current, incident_type: event.target.value }))} style={selectStyle}>
                    {INCIDENT_TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value || "all"} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="enterprise-field">
                  <span>Min severity</span>
                  <select value={escalationForm.min_severity} onChange={(event) => setEscalationForm((current) => ({ ...current, min_severity: event.target.value }))} style={selectStyle}>
                    {SEVERITY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="enterprise-form-grid">
                <label className="enterprise-field">
                  <span>Delay minutes</span>
                  <input type="number" min="0" value={escalationForm.escalation_delay_minutes} onChange={(event) => setEscalationForm((current) => ({ ...current, escalation_delay_minutes: event.target.value }))} style={inputStyle} />
                </label>
                <label className="enterprise-field">
                  <span>Assign to role</span>
                  <select value={escalationForm.assign_to_role} onChange={(event) => setEscalationForm((current) => ({ ...current, assign_to_role: event.target.value }))} style={selectStyle}>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {formatLabel(role)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="enterprise-check">
                <input type="checkbox" checked={escalationForm.create_task} onChange={(event) => setEscalationForm((current) => ({ ...current, create_task: event.target.checked }))} />
                <span>Create a task automatically</span>
              </label>
              <label className="enterprise-check">
                <input type="checkbox" checked={escalationForm.create_blocker} onChange={(event) => setEscalationForm((current) => ({ ...current, create_blocker: event.target.checked }))} />
                <span>Create a blocker automatically</span>
              </label>
              <label className="enterprise-check">
                <input type="checkbox" checked={escalationForm.notify_admins} onChange={(event) => setEscalationForm((current) => ({ ...current, notify_admins: event.target.checked }))} />
                <span>Notify admins immediately</span>
              </label>
              <button className="ui-btn-polish ui-focus-ring" type="submit" disabled={busyKey === "escalation-create"} style={{ ...ui.primaryButton, justifyContent: "center", opacity: busyKey === "escalation-create" ? 0.7 : 1 }}>
                {busyKey === "escalation-create" ? <ArrowPathIcon style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                Create Escalation Rule
              </button>
            </form>
          </div>

          <div className="enterprise-section-block">
            <div className="enterprise-block-head">
              <h3>Existing SLA rules</h3>
              <span>{slaRules.length}</span>
            </div>
            {slaRules.length ? (
              <div className="enterprise-list">
                {slaRules.map((rule) => (
                  <article key={rule.id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>{rule.name}</h3>
                        <p>
                          {formatLabel(rule.metric)} | {rule.threshold_percent}% threshold | {rule.lookback_days}d lookback | {formatLabel(rule.severity)}
                        </p>
                      </div>
                      <StatusPill status={rule.enabled ? "completed" : "cancelled"} />
                    </div>
                    <p className="enterprise-list-meta">
                      {rule.auto_create_incident ? "Creates incidents" : "No incident creation"} | {rule.auto_notify_admins ? "Notifies admins" : "Silent"}
                    </p>
                    <div className="enterprise-inline-actions">
                      <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => toggleSlaRule(rule)} disabled={busyKey === `sla-${rule.id}`} style={ui.secondaryButton}>
                        {rule.enabled ? "Pause" : "Enable"}
                      </button>
                      <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => deleteSlaRule(rule)} disabled={busyKey === `sla-delete-${rule.id}`} style={{ ...ui.secondaryButton, color: palette.danger }}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No SLA rules yet" description="Create the first SLA rule to begin detecting service drift automatically." />
            )}
          </div>

          <div className="enterprise-section-block">
            <div className="enterprise-block-head">
              <h3>Existing escalation rules</h3>
              <span>{escalationRules.length}</span>
            </div>
            {escalationRules.length ? (
              <div className="enterprise-list">
                {escalationRules.map((rule) => (
                  <article key={rule.id} className="enterprise-list-card">
                    <div className="enterprise-card-header">
                      <div>
                        <h3>{rule.name}</h3>
                        <p>
                          {rule.incident_type ? formatLabel(rule.incident_type) : "All incidents"} | {formatLabel(rule.min_severity)}+ | {rule.escalation_delay_minutes}m delay
                        </p>
                      </div>
                      <StatusPill status={rule.enabled ? "completed" : "cancelled"} />
                    </div>
                    <p className="enterprise-list-meta">
                      Assigns to {formatLabel(rule.assign_to_role)} | {rule.create_task ? "Creates task" : "No task"} | {rule.create_blocker ? "Creates blocker" : "No blocker"}
                    </p>
                    <div className="enterprise-inline-actions">
                      <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => toggleEscalationRule(rule)} disabled={busyKey === `escalation-${rule.id}`} style={ui.secondaryButton}>
                        {rule.enabled ? "Pause" : "Enable"}
                      </button>
                      <button className="ui-btn-polish ui-focus-ring" type="button" onClick={() => deleteEscalationRule(rule)} disabled={busyKey === `escalation-delete-${rule.id}`} style={{ ...ui.secondaryButton, color: palette.danger }}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <WorkspaceEmptyState palette={palette} title="No escalation rules yet" description="Create the first escalation rule to route serious incidents into blockers, tasks, or admin review." />
            )}
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
