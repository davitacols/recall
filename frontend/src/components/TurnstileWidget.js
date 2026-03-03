import React, { useEffect, useMemo, useRef } from "react";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function ensureScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;
  const containerId = useMemo(
    () => `turnstile-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;
    ensureScript();

    let timer = null;
    const mountWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey,
        theme,
        callback: (token) => onVerifyRef.current?.(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onErrorRef.current?.(),
      });
    };

    timer = window.setInterval(mountWidget, 200);
    window.setTimeout(() => {
      if (timer) {
        window.clearInterval(timer);
      }
    }, 10000);

    return () => {
      if (timer) {
        window.clearInterval(timer);
      }
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [containerId, siteKey, theme]);

  if (!siteKey) {
    return null;
  }

  return <div id={containerId} ref={containerRef} />;
}
