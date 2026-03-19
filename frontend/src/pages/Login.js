import React, { useEffect, useMemo, useRef, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import TurnstileWidget from "../components/TurnstileWidget";
import BrandLogo from "../components/BrandLogo";
import { useToast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

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
    const saved = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => document.documentElement.setAttribute('data-theme', saved || localStorage.getItem('theme') || 'light');
  }, []);
}

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

  const finalizeAuth = (message = "Welcome back!") => {
    addToast(message, "success");
    navigate("/dashboard", { replace: true });
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
      addToast(
        inviteToken ? "Account created! Please sign in." : "Organization created! Please sign in.",
        "success"
      );
    } else {
      setError(result.error);
      addToast(result.error, "error");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (inviteToken || !googleClientId) return;

    let canceled = false;
    let resizeTimer = null;
    let resizeHandler = null;
    const scriptId = "google-gsi-script";
    const mountId = isLogin ? "google-signin-button" : "google-signup-button";
    setGoogleReady(false);

    const renderGoogleButton = () => {
      const mountPoint = document.getElementById(mountId);
      if (!mountPoint || !window.google?.accounts?.id) return;

      const width = Math.max(250, Math.min(390, (mountPoint.parentElement?.clientWidth || 340) - 8));
      mountPoint.innerHTML = "";
      window.google.accounts.id.renderButton(mountPoint, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width,
        text: "continue_with",
        logo_alignment: "left",
      });
      setGoogleReady(true);
    };

    const initializeGoogle = () => {
      if (canceled || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
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
              addToast(orgError, "error");
              return;
            }
            googlePayload.organization = organization;
            if (googleContext.full_name.trim()) {
              googlePayload.full_name = googleContext.full_name.trim();
            }
          }

          setGoogleLoading(true);
          const result = await googleLogin(googlePayload);
          setGoogleLoading(false);
          if (result.success) {
            finalizeAuth(
              googleContext.isLogin
                ? "Welcome back!"
                : result.message || "Workspace created successfully."
            );
          } else {
            setError(result.error);
            addToast(result.error, "error");
          }
        },
      });

      renderGoogleButton();
      resizeHandler = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderGoogleButton, 120);
      };
      window.addEventListener("resize", resizeHandler);
    };

    const script = document.getElementById(scriptId);
    if (script) {
      initializeGoogle();
    } else {
      const nextScript = document.createElement("script");
      nextScript.id = scriptId;
      nextScript.src = "https://accounts.google.com/gsi/client";
      nextScript.async = true;
      nextScript.defer = true;
      nextScript.onload = initializeGoogle;
      document.body.appendChild(nextScript);
    }

    return () => {
      canceled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    };
  }, [addToast, googleClientId, googleLogin, inviteToken, isLogin]);

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
          <button type="button" onClick={() => navigate("/")} className="auth-brand">
            <BrandLogo tone="warm" size="lg" />
          </button>

          <div>
            <p className="auth-kicker">Decision memory for teams</p>
            <h1 className="auth-headline">Pick up the thread without re-reading everything.</h1>
            <p className="auth-copy">
              Sign in to Knoledgr and recover the rationale, documents, and next actions attached to your team's work.
            </p>
          </div>

          <div className="auth-showcase-visual" aria-hidden="true">
            <img
              src="/brand/knoledgr-app-screenshot.svg"
              alt=""
              className="auth-showcase-shot"
            />
            <img
              src="/brand/knoledgr-memory-orbit.svg"
              alt=""
              className="auth-showcase-orbit"
            />
          </div>

          <div className="auth-stats">
            <div className="auth-stat-card">
              <strong>Org-aware access</strong>
              <span>One identity, many organizations, zero data collisions.</span>
            </div>
            <div className="auth-stat-card">
              <strong>Verified sessions</strong>
              <span>Google, password, and Turnstile flow under one secure gateway.</span>
            </div>
          </div>
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
                  ? "Access your workspace and continue where your team stopped."
                  : "Set up your account with email or Google and activate your team's decision memory."}
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
                <>
                  <section className="auth-google-panel">
                    <div className="auth-google-head">
                      <span className="auth-google-badge" aria-hidden="true">
                        G
                      </span>
                      <div>
                        <h3>Continue with Google</h3>
                        <p>Fast sign-in with your verified Google account.</p>
                      </div>
                    </div>
                    <div className="auth-google-button-frame">
                      <div id="google-signin-button" className="auth-google-button-host" />
                    </div>
                    {!googleReady ? <small>Loading Google sign-in...</small> : null}
                    {googleLoading ? <small>Signing in with Google...</small> : null}
                    <small>Personal and business Google accounts are both supported.</small>
                  </section>

                  <div className="auth-divider" aria-hidden="true">
                    <span />
                    <small>or use email</small>
                    <span />
                  </div>
                </>
              ) : null}

              {!isLogin && !inviteToken ? (
                <Field label="Organization name">
                  <input
                    type="text"
                    required
                    value={credentials.organization}
                    onChange={(event) => setField("organization", event.target.value)}
                    placeholder="Acme Inc"
                  />
                </Field>
              ) : null}

              {!isLogin && !inviteToken && googleClientId ? (
                <>
                  <section className="auth-google-panel">
                    <div className="auth-google-head">
                      <span className="auth-google-badge" aria-hidden="true">
                        G
                      </span>
                      <div>
                        <h3>Create a workspace with Google</h3>
                        <p>Use a verified Google account to create your Knoledgr workspace faster.</p>
                      </div>
                    </div>
                    <div className="auth-google-button-frame">
                      <div id="google-signup-button" className="auth-google-button-host" />
                    </div>
                    {!googleReady ? <small>Loading Google sign-up...</small> : null}
                    {googleLoading ? <small>Creating your workspace...</small> : null}
                    <small>Personal and business Google accounts are both supported.</small>
                  </section>

                  <div className="auth-divider" aria-hidden="true">
                    <span />
                    <small>or sign up with email</small>
                    <span />
                  </div>
                </>
              ) : null}

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
                    {showPassword ? (
                      <EyeSlashIcon className="auth-eye-icon" />
                    ) : (
                      <EyeIcon className="auth-eye-icon" />
                    )}
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
