import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import TurnstileWidget from "../components/TurnstileWidget";
import api from "../services/api";
import "./AuthPages.css";

function ForgotPassword() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const saved = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => document.documentElement.setAttribute('data-theme', saved || localStorage.getItem('theme') || 'light');
  }, []);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = Boolean(process.env.REACT_APP_TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (!message) return undefined;
    setRedirectSeconds(5);
    const countdown = setInterval(() => {
      setRedirectSeconds((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    const redirect = setTimeout(() => navigate("/login"), 5000);
    return () => {
      clearInterval(countdown);
      clearTimeout(redirect);
    };
  }, [message, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete bot verification.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/api/auth/forgot-password/", {
        email,
        turnstile_token: turnstileToken,
      });
      setMessage(response.data?.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authp-shell">
      <div className="authp-glow authp-glow-a" />
      <div className="authp-glow authp-glow-b" />
      <div className="authp-grid">
        <aside className="authp-aside">
          <div className="authp-top">
            <button type="button" onClick={() => navigate("/")} className="authp-brand">
              <BrandLogo tone="blueLight" size="lg" />
            </button>
            <Link to="/docs" className="authp-top-link">
              Documentation
            </Link>
          </div>

          <div className="authp-copy-block">
            <p className="authp-kicker">Account Recovery</p>
            <h1 className="authp-headline">Reset access without losing momentum.</h1>
            <p className="authp-copy">
              Recover the thread quickly. We will send a secure reset link so you can get back into the workspace without starting over.
            </p>
          </div>

          <div className="authp-media" aria-hidden="true">
            <div className="authp-media-primary">
              <img src="/assets/trac3.png" alt="" />
            </div>
            <div className="authp-media-grid">
              <article className="authp-media-card">
                <img src="/assets/trac10.png" alt="" />
                <div className="authp-media-copy">
                  <strong>Recover the record</strong>
                  <p>Reset access without losing the context trail behind your work.</p>
                </div>
              </article>
              <article className="authp-media-card">
                <img src="/assets/trac12.png" alt="" />
                <div className="authp-media-copy">
                  <strong>Re-enter calmly</strong>
                  <p>The path back into Knoledgr should feel deliberate, secure, and fast.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="authp-list">
            <div className="authp-list-item">
              <strong>Secure by default</strong>
              <span>Recovery links are short-lived, tied to your account, and designed to protect the workspace.</span>
            </div>
            <div className="authp-list-item">
              <strong>Fast recovery</strong>
              <span>Once the link lands, you can set a new password and continue where the team left off.</span>
            </div>
          </div>
        </aside>

        <main className="authp-main">
          <section className="authp-card">
            <header>
              <p className="authp-panel-eyebrow">Recovery flow</p>
              <h2 className="authp-title">Reset your password</h2>
              <p className="authp-subtitle">
                Enter the email tied to your account and we will send the recovery link there.
              </p>
            </header>

            <div className="authp-info-grid">
              <article className="authp-info-card">
                <span>Step 01</span>
                <strong>Request the link</strong>
                <p>Submit the email you use to sign in to Knoledgr.</p>
              </article>
              <article className="authp-info-card">
                <span>Step 02</span>
                <strong>Set a new password</strong>
                <p>Use the secure link from your inbox to create a fresh credential.</p>
              </article>
            </div>

            <form onSubmit={handleSubmit} className="authp-form" aria-busy={loading}>
              <label className="authp-field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                />
              </label>

              {turnstileEnabled ? (
                <div className="authp-turnstile">
                  <TurnstileWidget
                    theme="dark"
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </div>
              ) : null}

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
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <footer className="authp-foot">
              <div className="authp-links">
                <Link to="/login" className="authp-link">
                  Back to sign in
                </Link>
                <Link to="/privacy" className="authp-link">
                  Privacy
                </Link>
                <Link to="/terms" className="authp-link">
                  Terms
                </Link>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ForgotPassword;
