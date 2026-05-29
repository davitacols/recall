import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { WorkspaceHero, WorkspacePanel } from "../components/WorkspaceChrome";

const CONFIG_URL = "/api/integrations/fresh/github/config/";

function GitHubGlyph({ size = 22, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56l-.01-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14l-.01 3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function relativeTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const icon14 = { width: 14, height: 14 };

export default function GitHubIntegration() {
  const toast = useToast?.() || { addToast: () => {} };
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyToggle, setBusyToggle] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ repo: "", token: "", secret: "", auto_link_prs: true });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(CONFIG_URL);
      setCfg(data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to load GitHub integration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const connect = async (e) => {
    e?.preventDefault();
    const [repo_owner, repo_name] = form.repo.trim().split("/");
    if (!repo_owner || !repo_name) {
      setError("Enter the repository as owner/repo (e.g. acme/recall).");
      return;
    }
    if (!form.token.trim()) {
      setError("A personal access token is required to connect.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(CONFIG_URL, {
        access_token: form.token.trim(),
        repo_owner,
        repo_name,
        webhook_secret: form.secret.trim(),
        auto_link_prs: form.auto_link_prs,
        enabled: true,
      });
      setCfg(data.github);
      setForm({ repo: "", token: "", secret: "", auto_link_prs: true });
      toast.addToast?.("GitHub connected", "success");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not connect GitHub");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async (patch, key) => {
    if (!cfg?.configured) return;
    setBusyToggle(key);
    try {
      const { data } = await api.post(CONFIG_URL, {
        repo_owner: cfg.repo_owner,
        repo_name: cfg.repo_name,
        enabled: cfg.enabled,
        auto_link_prs: cfg.auto_link_prs,
        ...patch,
      });
      setCfg(data.github);
    } catch (err) {
      toast.addToast?.("Failed to update setting", "error");
    } finally {
      setBusyToggle("");
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect GitHub? Linked history is kept, but new events will stop syncing.")) return;
    setSaving(true);
    try {
      const { data } = await api.delete(CONFIG_URL);
      setCfg(data.github);
      toast.addToast?.("GitHub disconnected", "success");
    } catch (err) {
      toast.addToast?.("Failed to disconnect", "error");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };

  const configured = cfg?.configured;
  const summary = cfg?.engineering_summary || {};
  const activity = cfg?.recent_activity || [];
  const readiness = cfg?.webhook_readiness || {};
  const obs = cfg?.webhook_observability || {};

  const toneColor = (tone) =>
    ({ ok: palette.success, warn: palette.warn, bad: palette.danger }[tone] || palette.muted);

  const Badge = ({ tone = "muted", children }) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 11px",
      borderRadius: 999, fontSize: 12, fontWeight: 700, color: toneColor(tone),
      background: palette.cardAlt, border: `1px solid ${palette.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: toneColor(tone) }} />
      {children}
    </span>
  );

  const Toggle = ({ on, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      style={{
        position: "relative", width: 38, height: 22, borderRadius: 999, border: "none",
        cursor: disabled ? "default" : "pointer", flexShrink: 0,
        background: on ? palette.accent : palette.progressTrack,
        opacity: disabled ? 0.5 : 1, transition: "background 140ms ease",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999,
        background: "#FFFFFF", boxShadow: "0 1px 2px rgba(11,12,16,0.3)", transition: "left 140ms ease",
      }} />
    </button>
  );

  const labelStyle = { display: "block", fontSize: 13, fontWeight: 700, color: palette.text, marginBottom: 6 };
  const hintStyle = { fontSize: 12, color: palette.muted, margin: "6px 0 0", lineHeight: 1.5 };
  const toggleRow = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "12px 0", borderTop: `1px solid ${palette.border}`,
  };

  const wsStats = configured
    ? [
        { label: "Decision PRs", value: `${summary.decision_pull_requests ?? 0}`, helper: "Linked to decisions" },
        { label: "Issue PRs", value: `${summary.issue_pull_requests ?? 0}`, helper: "Linked to issues" },
        { label: "Commits", value: `${summary.commits ?? 0}`, helper: "Tracked in workspace" },
        { label: "Deployments", value: `${summary.deployments ?? 0}`, helper: "Recorded" },
      ]
    : [];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Integrations"
        title="GitHub"
        description="Connect your organization's repository to track code changes, pull requests, and deployments alongside your decisions."
        stats={wsStats}
        aside={
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
            <span style={{
              display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: 18,
              background: darkMode ? "rgba(255,255,255,0.06)" : "#1F2328", color: "#FFFFFF",
              border: `1px solid ${palette.border}`,
            }}>
              <GitHubGlyph size={34} />
            </span>
          </div>
        }
        actions={
          configured ? (
            <>
              <button className="ui-btn-polish ui-focus-ring" onClick={load} style={ui.secondaryButton}>
                <ArrowPathIcon style={icon14} /> Refresh
              </button>
              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={disconnect}
                disabled={saving}
                style={{ ...ui.secondaryButton, color: palette.danger, borderColor: palette.border }}
              >
                Disconnect
              </button>
            </>
          ) : null
        }
      />

      {error ? (
        <div style={{
          padding: "12px 14px", borderRadius: 12, fontSize: 13,
          background: palette.cardAlt, border: `1px solid ${palette.danger}`, color: palette.danger,
        }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="memory">
          <div style={{ minHeight: 200, display: "grid", placeItems: "center" }}>
            <div style={{
              width: 26, height: 26, borderRadius: 999,
              border: `2px solid ${palette.border}`, borderTopColor: palette.accent,
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        </WorkspacePanel>
      ) : !configured ? (
        <WorkspacePanel
          palette={palette}
          darkMode={darkMode}
          variant="memory"
          eyebrow="Setup"
          title="Connect a repository"
          description="Point Knoledgr at the repository whose code changes you want tied to this workspace."
        >
          <form onSubmit={connect} style={{ maxWidth: 540, display: "grid", gap: 16 }}>
            <div>
              <label style={labelStyle}>Repository</label>
              <input
                placeholder="owner/repo"
                value={form.repo}
                onChange={(e) => setForm({ ...form, repo: e.target.value })}
                style={{ ...ui.input, background: palette.cardAlt, color: palette.text }}
                autoFocus
              />
              <p style={hintStyle}>The full repository path, e.g. acme/recall.</p>
            </div>
            <div>
              <label style={labelStyle}>Personal access token</label>
              <input
                type="password"
                placeholder="ghp_…"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
                style={{ ...ui.input, background: palette.cardAlt, color: palette.text }}
              />
              <p style={hintStyle}>Needs repo scope to read commits and pull requests. Stored encrypted.</p>
            </div>
            <div>
              <label style={labelStyle}>
                Webhook secret <span style={{ color: palette.muted, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="password"
                placeholder="Used to verify incoming events"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                style={{ ...ui.input, background: palette.cardAlt, color: palette.text }}
              />
              <p style={hintStyle}>Add the same secret in GitHub so deliveries are signature-verified.</p>
            </div>
            <div style={{ ...toggleRow, borderTop: "none", padding: 0 }}>
              <span>
                <b style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: palette.text }}>Auto-link pull requests</b>
                <span style={{ fontSize: 12.5, color: palette.muted }}>Match PRs and commits to decisions by key automatically.</span>
              </span>
              <Toggle on={form.auto_link_prs} onClick={() => setForm({ ...form, auto_link_prs: !form.auto_link_prs })} />
            </div>
            <button type="submit" className="ui-btn-polish ui-focus-ring" disabled={saving} style={{ ...ui.primaryButton, justifyContent: "center", width: "100%", padding: "12px 16px" }}>
              {saving ? "Connecting…" : "Connect GitHub"}
            </button>
          </form>
        </WorkspacePanel>
      ) : (
        <>
          <WorkspacePanel palette={palette} darkMode={darkMode} variant="memory">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{
                  display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 11,
                  background: palette.cardAlt, border: `1px solid ${palette.border}`, color: palette.muted, flexShrink: 0,
                }}>
                  <CodeBracketIcon style={{ width: 20, height: 20 }} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: palette.text, letterSpacing: "-0.01em" }}>{cfg.repo_slug}</div>
                  <div style={{ fontSize: 12.5, color: palette.muted, marginTop: 1 }}>Connected repository</div>
                </div>
              </div>
              <Badge tone={cfg.enabled ? "ok" : "muted"}>{cfg.enabled ? "Connected" : "Disabled"}</Badge>
            </div>

            <div style={{ ...toggleRow, marginTop: 8 }}>
              <span>
                <b style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: palette.text }}>Integration enabled</b>
                <span style={{ fontSize: 12.5, color: palette.muted }}>Sync commits, PRs, and deployments for this workspace.</span>
              </span>
              <Toggle on={cfg.enabled} disabled={busyToggle === "enabled"} onClick={() => updateSetting({ enabled: !cfg.enabled }, "enabled")} />
            </div>
            <div style={toggleRow}>
              <span>
                <b style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: palette.text }}>Auto-link pull requests</b>
                <span style={{ fontSize: 12.5, color: palette.muted }}>Match PRs and commits to decisions by key automatically.</span>
              </span>
              <Toggle on={cfg.auto_link_prs} disabled={busyToggle === "auto"} onClick={() => updateSetting({ auto_link_prs: !cfg.auto_link_prs }, "auto")} />
            </div>
          </WorkspacePanel>

          <div style={ui.responsiveSplit}>
            <WorkspacePanel palette={palette} darkMode={darkMode} variant="memory" eyebrow="Engineering" title="Recent activity">
              {activity.length === 0 ? (
                <p style={{ fontSize: 13, color: palette.muted, margin: 0 }}>No commits or pull requests yet.</p>
              ) : (
                <div style={{ display: "grid" }}>
                  {activity.map((item, i) => {
                    const isPr = item.type === "pull_request";
                    const Wrapper = item.url ? "a" : "div";
                    const props = item.url ? { href: item.url, target: "_blank", rel: "noreferrer" } : {};
                    return (
                      <Wrapper
                        key={item.url || i}
                        {...props}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0",
                          borderTop: i === 0 ? "none" : `1px solid ${palette.border}`, textDecoration: "none",
                        }}
                      >
                        <span style={{
                          display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: palette.accentSoft, color: isPr ? palette.success : palette.accent,
                        }}>
                          {isPr ? <ArrowsRightLeftIcon style={{ width: 15, height: 15 }} /> : <CodeBracketIcon style={{ width: 15, height: 15 }} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 540, color: palette.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title || (isPr ? "Pull request" : "Commit")}
                          </span>
                          <span style={{ display: "block", fontSize: 12, color: palette.muted, marginTop: 2 }}>
                            {item.author ? `${item.author} · ` : ""}{item.subtitle ? `${item.subtitle} · ` : ""}{relativeTime(item.timestamp)}
                          </span>
                        </span>
                        {item.url ? <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14, color: palette.muted, flexShrink: 0, marginTop: 8 }} /> : null}
                      </Wrapper>
                    );
                  })}
                </div>
              )}
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              darkMode={darkMode}
              variant="memory"
              eyebrow="Delivery"
              title="Webhooks"
              action={<Badge tone={obs.health === "healthy" ? "ok" : obs.health === "failing" ? "bad" : obs.health === "attention" ? "warn" : "muted"}>
                {{ healthy: "Healthy", failing: "Failing", attention: "Needs attention", awaiting_events: "Awaiting events" }[obs.health] || "Not configured"}
              </Badge>}
            >
              {readiness.webhook_url ? (
                <>
                  <label style={labelStyle}>Payload URL</label>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 8px 9px 12px",
                    border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.cardAlt,
                  }}>
                    <code style={{ flex: 1, minWidth: 0, fontSize: 12, color: palette.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {readiness.webhook_url}
                    </code>
                    <button onClick={() => copyWebhook(readiness.webhook_url)} style={{
                      display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "transparent",
                      color: palette.muted, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "5px 8px", borderRadius: 7, flexShrink: 0,
                    }}>
                      {copied ? <CheckIcon style={{ width: 13, height: 13 }} /> : <ClipboardIcon style={{ width: 13, height: 13 }} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </>
              ) : null}
              <p style={{ ...hintStyle, marginTop: 8 }}>{readiness.detail}</p>

              <div style={{ display: "flex", gap: 8, margin: "14px 0", flexWrap: "wrap" }}>
                {[["processed", obs.recent_processed_count], ["ignored", obs.recent_ignored_count], ["failed", obs.recent_failure_count]].map(([lbl, n]) => (
                  <span key={lbl} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 540, color: palette.muted,
                    padding: "5px 10px", borderRadius: 999, border: `1px solid ${palette.border}`,
                  }}>
                    <b style={{ color: palette.text, fontWeight: 700 }}>{n ?? 0}</b> {lbl}
                  </span>
                ))}
              </div>

              {(obs.recent_deliveries || []).length === 0 ? (
                <p style={{ fontSize: 13, color: palette.muted, margin: 0 }}>No deliveries received yet.</p>
              ) : (
                <div style={{ display: "grid" }}>
                  {obs.recent_deliveries.slice(0, 6).map((d, i) => (
                    <div key={d.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
                      borderTop: i === 0 ? "none" : `1px solid ${palette.border}`, fontSize: 12.5,
                    }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", height: 19, padding: "0 8px", borderRadius: 6,
                        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase",
                        color: toneColor(d.processing_state === "processed" ? "ok" : d.processing_state === "failed" ? "bad" : "muted"),
                        background: palette.cardAlt, border: `1px solid ${palette.border}`,
                      }}>
                        {d.processing_state}
                      </span>
                      <span style={{ fontWeight: 600, color: palette.text }}>{d.event}{d.action ? `.${d.action}` : ""}</span>
                      <span style={{ color: palette.muted, marginLeft: "auto" }}>{relativeTime(d.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>
          </div>
        </>
      )}
    </div>
  );
}
