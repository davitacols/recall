import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import api from "../services/api";
import "./AuthPages.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => document.documentElement.setAttribute('data-theme', saved || localStorage.getItem('theme') || 'light');
  }, []);
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(3);

  const checks = useMemo(
    () => [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "One lowercase letter", valid: /[a-z]/.test(password) },
      { label: "One number", valid: /\d/.test(password) },
    ],
    [password]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!uid || !token) {
      setError("Invalid reset link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (checks.some((check) => !check.valid)) {
      setError("Password does not meet requirements.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/auth/reset-password/", {
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      });
      setMessage(response.data?.message || "Password reset successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!message) return undefined;
    setRedirectSeconds(3);
    const countdown = setInterval(() => {
      setRedirectSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    const redirect = setTimeout(() => navigate("/login"), 3000);
    return () => {
      clearInterval(countdown);
      clearTimeout(redirect);
    };
  }, [message, navigate]);

  return (
    <div className="authp-shell">
      <div className="authp-glow authp-glow-a" />
      <div className="authp-glow authp-glow-b" />
      <div className="authp-grid">
        <aside className="authp-aside">
          <div className="authp-top">
            <button type="button" onClick={() => navigate("/")} className="authp-brand">
              <BrandLogo tone="warm" size="lg" />
            </button>
            <Link to="/docs" className="authp-top-link">
              Documentation
            </Link>
          </div>

          <div className="authp-copy-block">
            <p className="authp-kicker">Credential Update</p>
            <h1 className="authp-headline">Set a new password and continue.</h1>
            <p className="authp-copy">
              Choose a stronger credential and step back into the workspace with the team's context still intact.
            </p>
          </div>

          <div className="authp-media" aria-hidden="true">
            <div className="authp-media-primary">
              <img src="/assets/trac12.png" alt="" />
            </div>
            <div className="authp-media-grid">
              <article className="authp-media-card">
                <img src="/assets/trac5.png" alt="" />
                <div className="authp-media-copy">
                  <strong>Protect the record</strong>
                  <p>Strong credentials keep the operating memory safe as more context accumulates.</p>
                </div>
              </article>
              <article className="authp-media-card">
                <img src="/assets/trac10.png" alt="" />
                <div className="authp-media-copy">
                  <strong>Return with confidence</strong>
                  <p>Once reset succeeds, you can sign in immediately and keep moving.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="authp-list">
            <div className="authp-list-item">
              <strong>Strong password guidance</strong>
              <span>Requirements update in real time, so you know the credential is ready before submitting.</span>
            </div>
            <div className="authp-list-item">
              <strong>Immediate confirmation</strong>
              <span>As soon as the reset completes, the account is ready to sign in again.</span>
            </div>
          </div>
        </aside>

        <main className="authp-main">
          <section className="authp-card">
            <header>
              <p className="authp-panel-eyebrow">Reset flow</p>
              <h2 className="authp-title">Set a new password</h2>
              <p className="authp-subtitle">Choose a strong password for your account.</p>
            </header>

            <div className="authp-info-grid">
              <article className="authp-info-card">
                <span>Requirement</span>
                <strong>Strong enough to trust</strong>
                <p>Use a new credential that is longer, more unique, and harder to guess.</p>
              </article>
              <article className="authp-info-card">
                <span>Outcome</span>
                <strong>Direct return to sign-in</strong>
                <p>After resetting, the flow moves you back toward login automatically.</p>
              </article>
            </div>

            <form onSubmit={handleSubmit} className="authp-form" aria-busy={loading}>
              <label className="authp-field">
                <span>New Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password"
                />
              </label>

              <label className="authp-field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                />
              </label>

              <div className="authp-rules">
                {checks.map((check) => (
                  <div key={check.label} className={`authp-rule ${check.valid ? "valid" : ""}`}>
                    <span />
                    {check.label}
                  </div>
                ))}
              </div>

              {error ? <div className="authp-error" role="alert">{error}</div> : null}
              {message ? (
                <div className="authp-success" role="status">
                  {message} Redirecting to sign in in {redirectSeconds}s...
                </div>
              ) : null}

              <button type="submit" disabled={loading} className="authp-submit">
                {loading ? (
                  <>
                    <span className="authp-spinner" aria-hidden="true" />
                    Resetting...
                  </>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>

            <footer className="authp-foot">
              <div className="authp-links">
                <Link to="/login" className="authp-link">
                  Back to sign in
                </Link>
                <Link to="/security-annex" className="authp-link">
                  Security Annex
                </Link>
                <Link to="/privacy" className="authp-link">
                  Privacy
                </Link>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
