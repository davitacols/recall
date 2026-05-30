import React, { useEffect, useState } from "react";
import { XMarkIcon, CheckIcon, ArrowPathIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

/**
 * WorkspaceSwitcher — modal to move between the workspaces a user belongs to.
 * Switching is OTP-gated: pick a workspace → an email code is sent → confirm.
 */
export default function WorkspaceSwitcher({ onClose }) {
  const { listWorkspaces, requestWorkspaceSwitchCode, switchWorkspace } = useAuth();

  const [workspaces, setWorkspaces] = useState([]);
  const [currentSlug, setCurrentSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [target, setTarget] = useState(null); // { org_slug, org_name }
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      const result = await listWorkspaces();
      if (!active) return;
      if (result.success) {
        setWorkspaces(Array.isArray(result.data?.workspaces) ? result.data.workspaces : []);
        setCurrentSlug(result.data?.current_org_slug || "");
      } else {
        setLoadError(result.error || "Failed to load workspaces");
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [listWorkspaces]);

  const beginSwitch = async (ws) => {
    setTarget({ org_slug: ws.org_slug, org_name: ws.org_name });
    setOtp("");
    setActionError("");
    setInfo("");
    setBusy(true);
    const result = await requestWorkspaceSwitchCode({ org_slug: ws.org_slug });
    setBusy(false);
    if (result.success) setInfo(`We emailed a verification code to confirm the switch to ${ws.org_name}.`);
    else { setActionError(result.error || "Failed to send verification code"); setTarget(null); }
  };

  const confirmSwitch = async () => {
    if (!otp.trim()) { setActionError("Enter the verification code from your email."); return; }
    setBusy(true);
    setActionError("");
    const result = await switchWorkspace({ org_slug: target.org_slug, otp_code: otp.trim() });
    setBusy(false);
    if (result.success) {
      // Full reload so every surface picks up the new workspace context cleanly.
      window.location.assign("/dashboard");
    } else {
      setActionError(result.error || "Workspace switch failed");
    }
  };

  const resend = async () => {
    if (!target) return;
    setBusy(true);
    setActionError("");
    const result = await requestWorkspaceSwitchCode({ org_slug: target.org_slug });
    setBusy(false);
    if (result.success) setInfo("A new verification code is on its way.");
    else setActionError(result.error || "Failed to resend code");
  };

  const cancelTarget = () => { setTarget(null); setOtp(""); setActionError(""); setInfo(""); };

  return (
    <>
      <style>{WS_STYLES}</style>
      <div className="ws-overlay" onMouseDown={onClose}>
        <div className="ws-modal" role="dialog" aria-modal="true" aria-label="Switch workspace" onMouseDown={(e) => e.stopPropagation()}>
          <header className="ws-head">
            <span className="ws-head-title"><BuildingOffice2Icon /> Switch workspace</span>
            <button type="button" className="ws-x" aria-label="Close" onClick={onClose}><XMarkIcon /></button>
          </header>

          <div className="ws-body">
            {loading ? (
              <div className="ws-loading"><span className="ws-spinner" /></div>
            ) : loadError ? (
              <p className="ws-error">{loadError}</p>
            ) : workspaces.length <= 1 ? (
              <p className="ws-empty">You're only a member of one workspace right now.</p>
            ) : (
              <>
                <ul className="ws-list">
                  {workspaces.map((ws) => {
                    const isCurrent = ws.org_slug === currentSlug;
                    const isTarget = target?.org_slug === ws.org_slug;
                    return (
                      <li key={ws.org_id || ws.org_slug} className={`ws-item ${isTarget ? "is-target" : ""}`}>
                        <span className="ws-mark">{(ws.org_name || ws.org_slug || "?").charAt(0).toUpperCase()}</span>
                        <span className="ws-meta">
                          <span className="ws-name">{ws.org_name || ws.org_slug}</span>
                          <span className="ws-slug">{ws.org_slug}</span>
                        </span>
                        {isCurrent ? (
                          <span className="ws-current"><CheckIcon /> Current</span>
                        ) : (
                          <button type="button" className="ws-switch" disabled={busy} onClick={() => beginSwitch(ws)}>
                            Switch
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {target ? (
                  <div className="ws-verify">
                    {info ? <p className="ws-info">{info}</p> : null}
                    <label className="ws-label" htmlFor="ws-otp">Verification code</label>
                    <input
                      id="ws-otp"
                      className="ws-input"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") confirmSwitch(); }}
                    />
                    {actionError ? <p className="ws-error">{actionError}</p> : null}
                    <div className="ws-actions">
                      <button type="button" className="ws-btn ws-btn-primary" disabled={busy} onClick={confirmSwitch}>
                        {busy ? "Switching…" : `Switch to ${target.org_name}`}
                      </button>
                      <button type="button" className="ws-btn" disabled={busy} onClick={resend}>
                        <ArrowPathIcon /> Resend
                      </button>
                      <button type="button" className="ws-btn ws-btn-ghost" disabled={busy} onClick={cancelTarget}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  actionError ? <p className="ws-error" style={{ marginTop: 12 }}>{actionError}</p> : null
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const WS_STYLES = `
.ws-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: var(--app-overlay, rgba(11,12,16,0.44));
  display: grid; place-items: center; padding: 20px;
  animation: wsFade 140ms ease;
}
@keyframes wsFade { from { opacity: 0; } to { opacity: 1; } }
.ws-modal {
  width: 100%; max-width: 460px;
  background: var(--app-surface-overlay, var(--app-surface));
  border: 1px solid var(--app-border);
  border-radius: 16px;
  box-shadow: var(--ui-shadow-lg);
  overflow: hidden;
  animation: wsPop 160ms cubic-bezier(0.2,0,0,1);
}
@keyframes wsPop { from { transform: translateY(8px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
.ws-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px; border-bottom: 1px solid var(--app-border-subtle);
}
.ws-head-title { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 620; color: var(--app-text); letter-spacing: -0.012em; }
.ws-head-title svg { width: 18px; height: 18px; color: var(--app-muted); }
.ws-x { display: grid; place-items: center; width: 30px; height: 30px; border: none; background: transparent; color: var(--app-muted); border-radius: 8px; cursor: pointer; }
.ws-x:hover { background: var(--app-surface-alt); color: var(--app-text); }
.ws-x svg { width: 17px; height: 17px; }
.ws-body { padding: 14px 16px 18px; }
.ws-loading { display: grid; place-items: center; min-height: 120px; }
.ws-spinner { width: 24px; height: 24px; border: 2px solid var(--app-border-strong); border-top-color: var(--app-accent); border-radius: 999px; animation: wsSpin 0.8s linear infinite; }
@keyframes wsSpin { to { transform: rotate(360deg); } }
.ws-empty, .ws-error, .ws-info { font-size: 13.5px; line-height: 1.5; margin: 4px 0; }
.ws-empty { color: var(--app-muted); padding: 16px 4px; text-align: center; }
.ws-error { color: var(--app-danger); }
.ws-info { color: var(--app-muted); }
.ws-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.ws-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 10px; border-radius: 10px; border: 1px solid transparent;
  transition: background 110ms ease, border-color 110ms ease;
}
.ws-item:hover { background: var(--app-surface-alt); }
.ws-item.is-target { border-color: var(--app-accent); background: var(--app-accent-soft); }
.ws-mark {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg, #6E76E0, #8A63D2); color: #FFFFFF; font-size: 14px; font-weight: 700;
}
.ws-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.ws-name { font-size: 14px; font-weight: 600; color: var(--app-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-slug { font-size: 12px; color: var(--app-muted); }
.ws-current { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--app-success); }
.ws-current svg { width: 14px; height: 14px; }
.ws-switch {
  height: 30px; padding: 0 13px; border-radius: 8px; border: 1px solid var(--app-border);
  background: var(--app-surface); color: var(--app-text); font-family: inherit; font-size: 13px; font-weight: 560; cursor: pointer;
  transition: background 110ms ease, border-color 110ms ease;
}
.ws-switch:hover:not(:disabled) { background: var(--app-surface-alt); border-color: var(--app-border-strong); }
.ws-switch:disabled { opacity: 0.5; cursor: default; }
.ws-verify { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--app-border-subtle); }
.ws-label { display: block; font-size: 12px; font-weight: 600; color: var(--app-text); margin-bottom: 6px; }
.ws-input {
  width: 100%; height: 40px; padding: 0 12px; border-radius: 9px;
  border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-text);
  font-family: inherit; font-size: 15px; letter-spacing: 0.1em; outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.ws-input:focus { border-color: var(--app-accent); box-shadow: 0 0 0 3px rgba(94,106,210,0.16); }
.ws-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.ws-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 9px;
  border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-text);
  font-family: inherit; font-size: 13.5px; font-weight: 560; cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, opacity 120ms ease;
}
.ws-btn svg { width: 14px; height: 14px; }
.ws-btn:hover:not(:disabled) { background: var(--app-surface-alt); }
.ws-btn:disabled { opacity: 0.55; cursor: default; }
.ws-btn-primary { background: var(--app-accent); border-color: transparent; color: #FFFFFF; box-shadow: 0 1px 2px rgba(11,12,16,0.16), inset 0 1px 0 rgba(255,255,255,0.16); }
.ws-btn-primary:hover:not(:disabled) { background: var(--b500); }
.ws-btn-ghost { border-color: transparent; color: var(--app-muted); }
`;
