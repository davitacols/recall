import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import GoogleSignInButton from "../components/GoogleSignInButton";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

export default function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  const inviteEmail = searchParams.get("email");
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login, register, googleLogin } = useAuth();

  const [mode, setMode] = useState(inviteToken ? "signup" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: inviteEmail || "",
    password: "",
    confirmPassword: "",
    full_name: "",
    token: inviteToken || "",
    organization: "",
  });

  const setField = (name, value) => setCredentials((prev) => ({ ...prev, [name]: value }));

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
    };
  }, []);

  const passwordChecks = useMemo(
    () => [
      { key: "len", label: "At least 8 characters", valid: credentials.password.length >= 8 },
      { key: "upper", label: "One uppercase letter", valid: /[A-Z]/.test(credentials.password) },
      { key: "lower", label: "One lowercase letter", valid: /[a-z]/.test(credentials.password) },
      { key: "digit", label: "One number", valid: /\d/.test(credentials.password) },
    ],
    [credentials.password]
  );

  const validateSignup = () => {
    if (!credentials.username.trim()) return "Email is required";
    if (!inviteToken && !credentials.organization.trim()) return "Workspace name is required";
    if (!credentials.full_name.trim()) return "Full name is required";
    if (credentials.password !== credentials.confirmPassword) return "Passwords do not match";
    if (passwordChecks.some((c) => !c.valid)) return "Password does not meet the required strength";
    return null;
  };

  const handleGoogleCredential = async (credential) => {
    setError("");
    setLoading(true);
    const result = await googleLogin({
      credential,
      ...(mode === "signup" && !inviteToken
        ? { organization: credentials.organization, full_name: credentials.full_name }
        : {}),
    });
    if (result.success) {
      addToast?.(result.createdWorkspace ? "Workspace created!" : "Welcome back!", "success");
      navigate("/dashboard", { replace: true });
    } else if (/organization name|workspace/i.test(result.error || "")) {
      setMode("signup");
      setError("Choose a workspace name below, then continue with Google to finish.");
    } else {
      setError(result.error || "Google sign-in failed");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "login") {
      const result = await login({ ...credentials });
      if (result.success) {
        addToast?.("Welcome back!", "success");
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error || "Sign-in failed");
      }
      setLoading(false);
      return;
    }

    const signupError = validateSignup();
    if (signupError) {
      setError(signupError);
      setLoading(false);
      return;
    }

    const result = await register({ ...credentials });
    if (result.success) {
      addToast?.(inviteToken ? "Account created! Please sign in." : "Workspace created! Please sign in.", "success");
      setMode("login");
      setCredentials({ ...credentials, password: "", confirmPassword: "", token: "" });
    } else {
      setError(result.error || "Sign-up failed");
    }
    setLoading(false);
  };

  const title =
    mode === "login"
      ? "Welcome back"
      : inviteToken
      ? "Join your workspace"
      : "Create your workspace";

  const subtitle =
    mode === "login"
      ? "Sign in to your Knoledgr workspace."
      : inviteToken
      ? "Set up your account to accept the invitation."
      : "Set up a new workspace for your team.";

  return (
    <div className="lg">
      <header className="lg-top">
        <Link to="/" className="lg-brand" aria-label="Knoledgr home">
          <BrandLogo tone="warm" size="md" />
        </Link>
        <Link to="/" className="lg-back">← Back to home</Link>
      </header>

      <main className="lg-main">
        <div className="lg-card">
          <div className="lg-head">
            <h1 className="lg-title">{title}</h1>
            <p className="lg-subtitle">{subtitle}</p>
          </div>

          {!inviteToken ? (
            <div className="lg-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`lg-tab ${mode === "login" ? "is-active" : ""}`}
                aria-selected={mode === "login"}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                className={`lg-tab ${mode === "signup" ? "is-active" : ""}`}
                aria-selected={mode === "signup"}
                onClick={() => setMode("signup")}
              >
                Create workspace
              </button>
            </div>
          ) : null}

          {error ? <div className="lg-error" role="alert">{error}</div> : null}

          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            onError={(message) => setError(message)}
            text={mode === "signup" ? "signup_with" : "continue_with"}
            dividerLabel={mode === "signup" ? "or sign up with email" : "or continue with email"}
          />

          <form onSubmit={handleSubmit} className="lg-form">
            <label className="lg-field">
              <span className="lg-label">Email</span>
              <input
                type="email"
                value={credentials.username}
                onChange={(e) => setField("username", e.target.value)}
                className="lg-input"
                autoComplete="email"
                required
                autoFocus
              />
            </label>

            {mode === "signup" ? (
              <label className="lg-field">
                <span className="lg-label">Full name</span>
                <input
                  value={credentials.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  className="lg-input"
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}

            {mode === "signup" && !inviteToken ? (
              <label className="lg-field">
                <span className="lg-label">Workspace name</span>
                <input
                  value={credentials.organization}
                  onChange={(e) => setField("organization", e.target.value)}
                  className="lg-input"
                  placeholder="e.g. Acme Engineering"
                  required
                />
              </label>
            ) : null}

            <label className="lg-field">
              <span className="lg-label">Password</span>
              <div className="lg-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setField("password", e.target.value)}
                  className="lg-input lg-input-pw"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="lg-pw-toggle"
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {mode === "signup" ? (
              <>
                <label className="lg-field">
                  <span className="lg-label">Confirm password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={credentials.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    className="lg-input"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <ul className="lg-checks">
                  {passwordChecks.map((c) => (
                    <li key={c.key} className={`lg-check ${c.valid ? "is-valid" : ""}`}>
                      <CheckIcon /> {c.label}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <button type="submit" className="lg-submit" disabled={loading}>
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          {mode === "login" ? (
            <div className="lg-foot-row">
              <button type="button" onClick={() => navigate("/forgot-password")} className="lg-link">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("signup")} className="lg-link">
                Create workspace →
              </button>
            </div>
          ) : (
            <p className="lg-foot-line">
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")} className="lg-link">
                Sign in
              </button>
            </p>
          )}

          <p className="lg-terms">
            By continuing, you agree to the <Link to="/terms">Terms</Link> and{" "}
            <Link to="/privacy">Privacy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
