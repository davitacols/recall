import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

/**
 * GitHubAppCallback — the destination GitHub redirects to after the user
 * accepts the App install. The URL looks like:
 *
 *   /integrations/github/callback?installation_id=12345&setup_action=install&state=abc
 *
 * We POST the installation_id + state to the backend, which calls GitHub
 * to verify the install exists, then we redirect to the GitHub
 * integration page so the user sees the new connection.
 *
 * Two redirect paths land here:
 *   - User installed (setup_action=install) → finalize and link.
 *   - User clicked "Cancel" or hit the back button (setup_action=cancel
 *     or no installation_id) → bounce back to /integrations/github with
 *     a flash message.
 */
export default function GitHubAppCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const ranRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ranRef.current) return; // StrictMode guard
    ranRef.current = true;

    const params = new URLSearchParams(location.search || "");
    const installationId = params.get("installation_id");
    const setupAction = params.get("setup_action");
    const state = params.get("state") || "";

    if (!installationId || setupAction === "cancel") {
      navigate("/integrations/github", { replace: true });
      return;
    }

    api
      .post("/api/integrations/github/app/callback/", {
        installation_id: Number(installationId),
        state,
      })
      .then(() => {
        navigate("/integrations/github", { replace: true });
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Could not finalize the GitHub install.";
        setError(msg);
      });
  }, [location.search, navigate]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
        color: "var(--app-text)",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        {error ? (
          <>
            <h2 style={{ margin: 0, fontSize: 20, color: "var(--app-text)" }}>
              GitHub install did not complete
            </h2>
            <p style={{ marginTop: 12, color: "var(--app-muted)", fontSize: 14, lineHeight: 1.55 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => navigate("/integrations/github", { replace: true })}
              style={{
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid var(--app-border)",
                background: "var(--app-surface-alt)",
                color: "var(--app-text)",
                cursor: "pointer",
              }}
            >
              Back to GitHub integration
            </button>
          </>
        ) : (
          <>
            <h2 style={{ margin: 0, fontSize: 20 }}>Finalizing GitHub install…</h2>
            <p style={{ marginTop: 12, color: "var(--app-muted)", fontSize: 14 }}>
              One second — we're confirming the install with GitHub and syncing your repo list.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
