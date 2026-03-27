import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import TurnstileWidget from "../components/TurnstileWidget";
import BrandLogo from "../components/BrandLogo";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

let googleScriptPromise = null;

function addPreconnectLink(href) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = href;
  if (!href.includes(window.location.origin)) {
    link.crossOrigin = "anonymous";
  }
  document.head.appendChild(link);
}

function ensureGoogleIdentityScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window unavailable"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (googleScriptPromise) return googleScriptPromise;

  addPreconnectLink("https://accounts.google.com");
  addPreconnectLink("https://www.gstatic.com");

  googleScriptPromise = new Promise((resolve, reject) => {
    const resolveIfReady = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        reject(new Error("Google Identity Services unavailable"));
      }
    };

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", resolveIfReady, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolveIfReady;
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.body.appendChild(script);
  });

  return googleScriptPromise;
}

function Field({ label, children }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      {children}
    </label>
  );
}

function useForceLightMode() {
  React.useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
  }, []);
}

const showcaseFrames = [
  { label: "Ask Recall", text: "Grounded answers from workspace history.", src: "/assets/trac10.png" },
  { label: "Knowledge Graph", text: "Connected records across decisions, docs, and work.", src: "/assets/trac3.png" },
];

const showcaseNotes = [
  "One entry flow for sign in, sign up, and workspace access.",
  "Google, password, and Turnstile stay in the same calm surface.",
  "Recovery and invite pages now follow the same public design system.",
];

const showcaseOrbitFrames = [
  { label: "Decisions", src: "/assets/trac12.png", className: "auth-orbit-card-a" },
  { label: "Docs", src: "/assets/trac5.png", className: "auth-orbit-card-b" },
];

function Login() {
  useForceLightMode();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  const inviteEmail = searchParams.get("email");
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login, register, googleLogin } = useAuth();

  const [isLogin, setIsLogin] = useState(!inviteToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [credentials, setCredentials] = useState({
    username: inviteEmail || "",
    password: "",
    confirmPassword: "",
    full_name: "",
    token: inviteToken || "",
    organization: "",
  });

  const turnstileEnabled = Boolean(process.env.REACT_APP_TURNSTILE_SITE_KEY);
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  const passwordChecks = useMemo(
    () => [
      { key: "len", label: "At least 8 characters", valid: credentials.password.length >= 8 },
      { key: "upper", label: "One uppercase letter", valid: /[A-Z]/.test(credentials.password) },
      { key: "lower", label: "One lowercase letter", valid: /[a-z]/.test(credentials.password) },
      { key: "digit", label: "One number", valid: /\d/.test(credentials.password) },
    ],
    [credentials.password]
  );

  const setField = (name, value) => setCredentials((prev) => ({ ...prev, [name]: value }));
  const googleContextRef = useRef({ isLogin, organization: "", full_name: "" });
  googleContextRef.current = {
    isLogin,
    organization: credentials.organization,
    full_name: credentials.full_name,
  };

  const finalizeAuth = useCallback(
    (message = "Welcome back!") => {
      addToast(message, "success");
      navigate("/dashboard", { replace: true });
    },
    [addToast, navigate]
  );

  const authHandlersRef = useRef({ addToast, googleLogin, finalizeAuth });
  authHandlersRef.current = { addToast, googleLogin, finalizeAuth };

  const renderGoogleButtons = useCallback(() => {
    if (!window.google?.accounts?.id) return;

    [
      { id: "google-signin-button", width: 360 },
      { id: "google-signup-button", width: 360 },
    ].forEach(({ id, width }) => {
      const mountPoint = document.getElementById(id);
      if (!mountPoint) return;

      const computedWidth = Math.max(250, Math.min(width, (mountPoint.parentElement?.clientWidth || width) - 8));
      mountPoint.innerHTML = "";
      window.google.accounts.id.renderButton(mountPoint, {
        theme: "filled_blue",
        size: "large",
        shape: "pill",
        width: computedWidth,
        text: "continue_with",
        logo_alignment: "left",
      });
    });
  }, []);

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    setError("");
  };

  const validateSignup = () => {
    if (!credentials.username.trim()) return "Email is required";
    if (!inviteToken && !credentials.organization.trim()) return "Organization name is required";
    if (!credentials.full_name.trim()) return "Full name is required";
    if (credentials.password !== credentials.confirmPassword) return "Passwords do not match";
    if (passwordChecks.some((check) => !check.valid)) return "Password does not meet the required strength";
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete bot verification.");
      setLoading(false);
      return;
    }

    if (isLogin) {
      const result = await login({ ...credentials, turnstile_token: turnstileToken });
      if (result.success) {
        finalizeAuth();
      } else {
        setError(result.error);
        addToast(result.error, "error");
      }
      setLoading(false);
      return;
    }

    const signupError = validateSignup();
    if (signupError) {
      setError(signupError);
      addToast(signupError, "error");
      setLoading(false);
      return;
    }

    const result = await register({ ...credentials, turnstile_token: turnstileToken });
    if (result.success) {
      setIsLogin(true);
      setCredentials({
        username: inviteEmail || "",
        password: "",
        confirmPassword: "",
        full_name: "",
        token: "",
        organization: "",
      });
      addToast(inviteToken ? "Account created! Please sign in." : "Organization created! Please sign in.", "success");
    } else {
      setError(result.error);
      addToast(result.error, "error");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (inviteToken || !googleClientId) return undefined;

    let active = true;
    let resizeFrame = null;
    const handleResize = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (active) renderGoogleButtons();
      });
    };

    const handleCredential = async (response) => {
      const credential = response?.credential;
      if (!credential) {
        setError("Google sign-in failed");
        return;
      }

      const googleContext = googleContextRef.current;
      const googlePayload = { credential };
      if (!googleContext.isLogin) {
        const organization = googleContext.organization.trim();
        if (!organization) {
          const orgError = "Organization name is required before continuing with Google.";
          setError(orgError);
          authHandlersRef.current.addToast(orgError, "error");
          return;
        }
        googlePayload.organization = organization;
        if (googleContext.full_name.trim()) {
          googlePayload.full_name = googleContext.full_name.trim();
        }
      }

      setGoogleLoading(true);
      const result = await authHandlersRef.current.googleLogin(googlePayload);
      if (!active) return;
      setGoogleLoading(false);
      if (result.success) {
        authHandlersRef.current.finalizeAuth(
          googleContext.isLogin
            ? "Welcome back!"
            : result.message || "Workspace created successfully."
        );
      } else {
        setError(result.error);
        authHandlersRef.current.addToast(result.error, "error");
      }
    };

    ensureGoogleIdentityScript()
      .then(() => {
        if (!active || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredential,
        });

        setGoogleUnavailable(false);
        setGoogleReady(true);
        renderGoogleButtons();

        window.addEventListener("resize", handleResize);
      })
      .catch(() => {
        if (!active) return;
        setGoogleReady(false);
        setGoogleUnavailable(true);
      });

    return () => {
      active = false;
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [googleClientId, inviteToken, renderGoogleButtons]);

  useEffect(() => {
    if (!googleReady || inviteToken || !googleClientId) return;
    const timer = window.setTimeout(() => renderGoogleButtons(), 30);
    return () => window.clearTimeout(timer);
  }, [googleClientId, googleReady, inviteToken, isLogin, renderGoogleButtons]);

  return (
    <div className="auth-shell">
      <div className="auth-glow auth-glow-top" />
      <div className="auth-glow auth-glow-bottom" />

      <div className="auth-grid">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="auth-showcase"
        >
          <div className="auth-showcase-top">
            <button type="button" onClick={() => navigate("/")} className="auth-brand">
              <BrandLogo tone="warm" size="lg" />
            </button>
            <Link to="/docs" className="auth-showcase-link">
              Documentation
            </Link>
          </div>

          <div className="auth-showcase-copy">
            <p className="auth-kicker">Decision memory for teams</p>
            <h1 className="auth-headline">Access the record without losing the thread.</h1>
            <p className="auth-copy">
              Sign in, create a workspace, or join an invite from one cleaner entry point that keeps the product front and center.
            </p>
          </div>

          <div className="auth-showcase-media" aria-hidden="true">
            <div className="auth-showcase-scene">
              <div className="auth-video-frame">
                <video
                  className="auth-showcase-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/assets/trac1.png"
                >
                  <source src="/assets/Decision_Memory_for_Teams.mp4" type="video/mp4" />
                </video>
                <span className="auth-video-badge">Walkthrough</span>
                <span className="auth-video-corner-brand">Knoledgr</span>
              </div>

              <div className="auth-orbit-grid">
                {showcaseOrbitFrames.map((frame) => (
                  <div key={frame.label} className={`auth-orbit-card ${frame.className}`}>
                    <img src={frame.src} alt="" />
                    <span>{frame.label}</span>
                  </div>
                ))}
                <div className="auth-orbit-core" />
              </div>
            </div>

            <div className="auth-showcase-grid">
              {showcaseFrames.map((frame) => (
                <div key={frame.label} className="auth-frame-card">
                  <img src={frame.src} alt="" className="auth-frame-image" />
                  <div className="auth-frame-copy">
                    <span>{frame.label}</span>
                    <p>{frame.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ul className="auth-showcase-notes">
            {showcaseNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="auth-main"
        >
          <section className="auth-card">
            <header className="auth-card-header">
              <p className="auth-form-kicker">{isLogin ? "Welcome back" : "Get started"}</p>
              <h2>
                {isLogin
                  ? "Sign in to Knoledgr"
                  : inviteToken
                    ? "Join your workspace"
                    : "Create your workspace"}
              </h2>
              <p>
                {isLogin
                  ? "Continue where your team stopped, with the context trail still intact."
                  : "Create an account, name the workspace, and start building the team's shared decision memory."}
              </p>
            </header>

            {!inviteToken ? (
              <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  onClick={() => switchMode(true)}
                  className={`auth-mode-btn ${isLogin ? "active" : ""}`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(false)}
                  className={`auth-mode-btn ${!isLogin ? "active" : ""}`}
                >
                  Sign up
                </button>
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              {error ? (
                <div className="auth-alert" role="alert" aria-live="polite">
                  {error}
                </div>
              ) : null}

              {isLogin && !inviteToken && googleClientId ? (
                <section className="auth-form-cluster auth-google-panel">
                  <div className="auth-cluster-head">
                    <div>
                      <p className="auth-section-label">Fast access</p>
                      <h3>Continue with Google</h3>
                    </div>
                    <span className="auth-google-badge" aria-hidden="true">
                      G
                    </span>
                  </div>
                  <p className="auth-cluster-copy">Use a verified Google account to get back into Knoledgr quickly.</p>
                  <div className="auth-google-meta" aria-hidden="true">
                    <span>Fastest route</span>
                    <span>Verified identity</span>
                  </div>
                  <div className="auth-google-button-frame">
                    <div id="google-signin-button" className="auth-google-button-host" />
                  </div>
                  {!googleReady ? <small className="auth-google-status">Loading Google sign-in...</small> : null}
                  {googleLoading ? <small className="auth-google-status">Signing in with Google...</small> : null}
                  {googleUnavailable ? <small className="auth-google-status">Google sign-in is temporarily unavailable. Use email sign-in below.</small> : null}
                  <small className="auth-google-status">Personal and business Google accounts are both supported.</small>
                </section>
              ) : null}

              {!isLogin && !inviteToken ? (
                <section className="auth-form-cluster">
                  <div className="auth-cluster-head">
                    <div>
                      <p className="auth-section-label">Workspace</p>
                      <h3>Name the environment</h3>
                    </div>
                  </div>
                  <Field label="Organization name">
                    <input
                      type="text"
                      required
                      value={credentials.organization}
                      onChange={(event) => setField("organization", event.target.value)}
                      placeholder="Acme Inc"
                    />
                  </Field>

                  {googleClientId ? (
                    <div className="auth-google-panel auth-google-panel-signup">
                      <div className="auth-cluster-head">
                        <div>
                          <p className="auth-section-label">Quick start</p>
                          <h3>Create with Google</h3>
                        </div>
                        <span className="auth-google-badge" aria-hidden="true">
                          G
                        </span>
                      </div>
                      <p className="auth-cluster-copy">Create a workspace faster with a verified Google identity.</p>
                      <div className="auth-google-meta" aria-hidden="true">
                        <span>Workspace setup</span>
                        <span>Verified identity</span>
                      </div>
                      <div className="auth-google-button-frame">
                        <div id="google-signup-button" className="auth-google-button-host" />
                      </div>
                      {!googleReady ? <small className="auth-google-status">Loading Google sign-up...</small> : null}
                      {googleLoading ? <small className="auth-google-status">Creating your workspace...</small> : null}
                      {googleUnavailable ? <small className="auth-google-status">Google sign-up is temporarily unavailable. Use email signup below.</small> : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="auth-form-cluster">
                <div className="auth-cluster-head">
                  <div>
                    <p className="auth-section-label">Identity</p>
                    <h3>{isLogin ? "Confirm who is signing in" : "Set up the account owner"}</h3>
                  </div>
                </div>

                {!isLogin ? (
                  <Field label="Full name">
                    <input
                      type="text"
                      required
                      value={credentials.full_name}
                      onChange={(event) => setField("full_name", event.target.value)}
                      placeholder="Jane Doe"
                    />
                  </Field>
                ) : null}

                <Field label="Email address">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    disabled={Boolean(inviteToken)}
                    className={inviteToken ? "is-disabled" : ""}
                    value={credentials.username}
                    onChange={(event) => setField("username", event.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
              </section>

              <section className="auth-form-cluster">
                <div className="auth-cluster-head">
                  <div>
                    <p className="auth-section-label">Security</p>
                    <h3>{isLogin ? "Use your secure credential" : "Create a strong credential"}</h3>
                  </div>
                </div>

                <Field label="Password">
                  <div className="auth-password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      value={credentials.password}
                      onChange={(event) => setField("password", event.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="auth-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlashIcon className="auth-eye-icon" /> : <EyeIcon className="auth-eye-icon" />}
                    </button>
                  </div>
                </Field>

                {!isLogin ? (
                  <>
                    <Field label="Confirm password">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        value={credentials.confirmPassword}
                        onChange={(event) => setField("confirmPassword", event.target.value)}
                        placeholder="********"
                      />
                    </Field>

                    <div className="auth-password-guide">
                      {passwordChecks.map((check) => (
                        <div key={check.key} className={`auth-rule ${check.valid ? "valid" : ""}`}>
                          <span />
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>

              {turnstileEnabled ? (
                <div className="auth-turnstile-wrap">
                  <TurnstileWidget
                    theme="dark"
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </div>
              ) : null}

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <footer className="auth-card-footer">
              {isLogin && !inviteToken ? (
                <>
                  <p>
                    No account?{" "}
                    <button type="button" onClick={() => switchMode(false)} className="auth-link-btn">
                      Sign up
                    </button>
                  </p>
                  <button type="button" onClick={() => navigate("/forgot-password")} className="auth-link-btn">
                    Forgot password?
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => navigate("/")} className="auth-back-btn">
                {"<"} Back to homepage
              </button>
              <div className="auth-legal">
                <Link to="/feedback" className="auth-legal-link">
                  Feedback
                </Link>
                <Link to="/privacy" className="auth-legal-link">
                  Privacy
                </Link>
                <Link to="/terms" className="auth-legal-link">
                  Terms
                </Link>
                <Link to="/security-annex" className="auth-legal-link">
                  Security Annex
                </Link>
              </div>
            </footer>
          </section>
        </motion.main>
      </div>
    </div>
  );
}

export default Login;
