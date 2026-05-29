import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

/**
 * GoogleSignInButton — renders the official Google Identity Services button.
 *
 * Best practices applied:
 * - Reads the public client ID + enabled flag from the backend (/api/auth/config/),
 *   so the button stays in sync with GOOGLE_OAUTH_ENABLED and hides when unconfigured.
 * - Loads the GSI script exactly once and reuses it across mounts.
 * - Uses the official rendered button (correct branding/a11y) and FedCM.
 * - Verification happens server-side: the ID token is sent to /api/auth/google/.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiPromise = null;

function loadGsi() {
  if (typeof window !== "undefined" && window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => { gsiPromise = null; reject(new Error("gsi load failed")); });
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { gsiPromise = null; reject(new Error("gsi load failed")); };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export default function GoogleSignInButton({ onCredential, onError, text = "continue_with", dividerLabel }) {
  const holderRef = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [config, setConfig] = useState(undefined); // undefined = loading, null = unavailable
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/api/auth/config/")
      .then((res) => { if (active) setConfig(res.data?.google || null); })
      .catch(() => { if (active) setConfig(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!config || !config.enabled || !config.client_id) return undefined;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !holderRef.current || !window.google?.accounts?.id) return;
        try {
          window.google.accounts.id.initialize({
            client_id: config.client_id,
            callback: (response) => {
              if (response?.credential) cbRef.current?.(response.credential);
              else onError?.("Google did not return a credential.");
            },
            use_fedcm_for_prompt: true,
            ux_mode: "popup",
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          holderRef.current.innerHTML = "";
          const width = Math.min(Math.max(holderRef.current.offsetWidth || 360, 240), 400);
          window.google.accounts.id.renderButton(holderRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text,
            shape: "pill",
            logo_alignment: "center",
            width,
          });
        } catch (e) {
          setFailed(true);
          onError?.("Couldn't start Google Sign-In.");
        }
      })
      .catch(() => {
        setFailed(true);
        onError?.("Couldn't load Google Sign-In.");
      });

    return () => { cancelled = true; };
  }, [config, text, onError]);

  // Loading, unconfigured, or failed → render nothing so email sign-in stands alone.
  if (config === undefined || config === null) return null;
  if (!config.enabled || !config.client_id || failed) return null;

  return (
    <>
      <div
        ref={holderRef}
        style={{ display: "flex", justifyContent: "center", minHeight: 44 }}
        aria-label="Sign in with Google"
      />
      {dividerLabel ? (
        <div
          aria-hidden="true"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            margin: "20px 0 4px", color: "var(--muted, #6B7280)",
            fontSize: 12, fontWeight: 500,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--line, #ECEDF1)" }} />
          {dividerLabel}
          <span style={{ flex: 1, height: 1, background: "var(--line, #ECEDF1)" }} />
        </div>
      ) : null}
    </>
  );
}
