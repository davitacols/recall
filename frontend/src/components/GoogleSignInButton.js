import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

/**
 * GoogleSignInButton — renders the official Google Identity Services button.
 *
 * Perf design (why this file is the shape it is):
 *
 *   1. Both the auth-config fetch and the GSI script load are kicked off at
 *      module-load time, in parallel. The original code fetched config first,
 *      then loaded the script — stacking two round-trips.
 *   2. A `<link rel="preconnect">` to accounts.google.com is added immediately
 *      so TLS to Google's CDN is warm before React mounts.
 *   3. The auth-config response is cached in sessionStorage. Repeat mounts
 *      (route changes, re-renders) render the button on the next frame.
 *   4. While loading, we reserve a skeleton at the button's final size so the
 *      layout doesn't jump and the user has visual feedback that the button
 *      is on the way — rather than a blank gap.
 *   5. The render effect only depends on the part of `config` that changes,
 *      not on `text`/`onError` which are typically fresh per render and would
 *      otherwise re-initialize Google on every parent render.
 *
 * Verification still happens server-side: the ID token is POSTed to
 * /api/auth/google/ by the parent's `onCredential` handler.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";
const CONFIG_CACHE_KEY = "knoledgr.authConfig.v1";

let gsiPromise = null;

function loadGsi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => {
        gsiPromise = null;
        reject(new Error("gsi load failed"));
      });
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiPromise = null;
      reject(new Error("gsi load failed"));
    };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

function getCachedConfig() {
  try {
    const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Cache is treated as authoritative for this tab session — we still
    // re-fetch in the background to catch flag changes, but the first paint
    // gets to use the cached answer immediately.
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch (_) {
    return undefined;
  }
}

function setCachedConfig(value) {
  try {
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(value || null));
  } catch (_) {
    /* storage may be disabled; ignore */
  }
}

// In-flight singleton so multiple buttons on the same page share one fetch.
let configPromise = null;
function fetchConfig() {
  if (configPromise) return configPromise;
  configPromise = api
    .get("/api/auth/config/")
    .then((res) => {
      const value = res?.data?.google || null;
      setCachedConfig(value);
      return value;
    })
    .catch(() => null)
    .finally(() => {
      // Allow a fresh fetch next time the component mounts cold.
      setTimeout(() => { configPromise = null; }, 0);
    });
  return configPromise;
}

// Module-load warmup: open the TLS connection and start the script download
// before any component mounts. Safe to call repeatedly.
(function warmup() {
  if (typeof document === "undefined") return;
  if (!document.querySelector("link[data-gsi-preconnect]")) {
    const pc = document.createElement("link");
    pc.rel = "preconnect";
    pc.href = "https://accounts.google.com";
    pc.crossOrigin = "";
    pc.dataset.gsiPreconnect = "1";
    document.head.appendChild(pc);
    const dns = document.createElement("link");
    dns.rel = "dns-prefetch";
    dns.href = "https://accounts.google.com";
    document.head.appendChild(dns);
  }
  // Kick off the script load now; resolve is harmless when we don't have a
  // client_id yet (we just won't call initialize/renderButton).
  loadGsi().catch(() => {});
  // Prime the config fetch too.
  fetchConfig();
})();

function Skeleton() {
  // Matches the rendered GSI pill: 44px tall, max ~400px wide.
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        minHeight: 44,
      }}
    >
      <div
        style={{
          height: 44,
          width: "100%",
          maxWidth: 360,
          borderRadius: 999,
          background:
            "linear-gradient(100deg, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 70%)",
          backgroundSize: "200% 100%",
          animation: "gsi-shimmer 1.2s infinite linear",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
      <style>{`@keyframes gsi-shimmer { to { background-position: -200% 0; } }`}</style>
    </div>
  );
}

export default function GoogleSignInButton({
  onCredential,
  onError,
  text = "continue_with",
  dividerLabel,
}) {
  const holderRef = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const errRef = useRef(onError);
  errRef.current = onError;

  // Seed from the session cache so repeat mounts skip the loading state.
  const [config, setConfig] = useState(getCachedConfig);
  const [failed, setFailed] = useState(false);

  // Always re-fetch in the background, even if seeded — flags can change.
  useEffect(() => {
    let active = true;
    fetchConfig().then((value) => {
      if (!active) return;
      setConfig(value === undefined ? null : value);
    });
    return () => { active = false; };
  }, []);

  // Only re-render the official button when the relevant config changes,
  // not when parent callbacks get new references.
  const clientId = config?.client_id || "";
  const enabled = !!(config && config.enabled && clientId);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !holderRef.current || !window.google?.accounts?.id) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response?.credential) cbRef.current?.(response.credential);
              else errRef.current?.("Google did not return a credential.");
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
          errRef.current?.("Couldn't start Google Sign-In.");
        }
      })
      .catch(() => {
        setFailed(true);
        errRef.current?.("Couldn't load Google Sign-In.");
      });

    return () => { cancelled = true; };
  }, [enabled, clientId, text]);

  // Resolved as unavailable / failed — render nothing so the email form
  // stands alone without phantom space.
  if (config === null || failed) return null;
  // Cached config exists but says google is off → render nothing.
  if (config && !enabled) return null;
  // Still loading (no cache) → show a skeleton so the layout is stable.
  if (config === undefined) {
    return (
      <>
        <Skeleton />
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
