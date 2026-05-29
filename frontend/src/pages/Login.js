import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import GoogleSignInButton from "../components/GoogleSignInButton";
import {
  AuthLayout,
  Button,
  Field,
  SectionMessage,
} from "../components/atlas";

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
      // On the create-workspace tab, pass the workspace name + name so a brand-new
      // Google account can provision its workspace in a single step.
      ...(mode === "signup" && !inviteToken
        ? { organization: credentials.organization, full_name: credentials.full_name }
        : {}),
    });
    if (result.success) {
      addToast?.(result.createdWorkspace ? "Workspace created!" : "Welcome back!", "success");
      navigate("/dashboard", { replace: true });
    } else if (/organization name|workspace/i.test(result.error || "")) {
      // New Google account with no workspace yet — guide them to name one.
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

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : inviteToken ? "Join your workspace" : "Create your workspace"}
      subtitle={
        mode === "login"
          ? "Sign in to your Knoledgr workspace."
          : inviteToken
          ? "Set up your account to accept the invitation."
          : "Set up a new workspace for your team."
      }
      footer={
        <p>
          By continuing, you agree to the{" "}
          <Link to="/terms" style={{ color: "var(--app-link)" }}>Terms</Link> and{" "}
          <Link to="/privacy" style={{ color: "var(--app-link)" }}>Privacy</Link>.
        </p>
      }
    >
      {/* Mode tabs */}
      {!inviteToken ? (
        <div className="atlas-tab-row" style={{ marginBottom: 24 }}>
          <button type="button" className="atlas-tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>
            Sign in
          </button>
          <button type="button" className="atlas-tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>
            Create workspace
          </button>
        </div>
      ) : null}

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      <GoogleSignInButton
        onCredential={handleGoogleCredential}
        onError={(message) => setError(message)}
        text={mode === "signup" ? "signup_with" : "continue_with"}
        dividerLabel={mode === "signup" ? "or sign up with email" : "or continue with email"}
      />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Email" isRequired>
          <input
            type="email"
            value={credentials.username}
            onChange={(e) => setField("username", e.target.value)}
            className="atlas-input"
            autoComplete="email"
            required
            autoFocus
          />
        </Field>

        {mode === "signup" ? (
          <Field label="Full name" isRequired>
            <input
              value={credentials.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="atlas-input"
              autoComplete="name"
              required
            />
          </Field>
        ) : null}

        {mode === "signup" && !inviteToken ? (
          <Field label="Workspace name" isRequired>
            <input
              value={credentials.organization}
              onChange={(e) => setField("organization", e.target.value)}
              className="atlas-input"
              placeholder="e.g. Acme Engineering"
              required
            />
          </Field>
        ) : null}

        <Field label="Password" isRequired>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={credentials.password}
              onChange={(e) => setField("password", e.target.value)}
              className="atlas-input"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={passwordToggle}
            >
              {showPassword ? <EyeSlashIcon style={{ width: 16, height: 16 }} /> : <EyeIcon style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </Field>

        {mode === "signup" ? (
          <>
            <Field label="Confirm password" isRequired>
              <input
                type={showPassword ? "text" : "password"}
                value={credentials.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                className="atlas-input"
                autoComplete="new-password"
                required
              />
            </Field>
            <ul style={passwordChecksList}>
              {passwordChecks.map((c) => (
                <li key={c.key} style={{ ...checkItem, color: c.valid ? "var(--g500)" : "var(--app-muted)" }}>
                  <CheckIcon style={{ width: 12, height: 12, opacity: c.valid ? 1 : 0.3 }} />
                  {c.label}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <Button type="submit" appearance="primary" fullWidth isDisabled={loading}>
          {loading ? (mode === "login" ? "Signing in…" : "Creating…") : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {mode === "login" ? (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <button type="button" onClick={() => navigate("/forgot-password")} style={linkButton}>
            Forgot password?
          </button>
          <button type="button" onClick={() => setMode("signup")} style={linkButton}>
            Create workspace →
          </button>
        </div>
      ) : (
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--app-muted)" }}>
          Already have an account?{" "}
          <button type="button" onClick={() => setMode("login")} style={linkButton}>
            Sign in
          </button>
        </p>
      )}
    </AuthLayout>
  );
}

const passwordToggle = {
  position: "absolute",
  right: 6,
  top: "50%",
  transform: "translateY(-50%)",
  width: 24,
  height: 24,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "none",
  color: "var(--app-muted)",
  cursor: "pointer",
  borderRadius: 3,
};

const passwordChecksList = {
  margin: "8px 0 0",
  padding: 0,
  listStyle: "none",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 4,
};

const checkItem = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
};

const linkButton = {
  background: "transparent",
  border: "none",
  color: "var(--app-link)",
  fontFamily: "inherit",
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
};
