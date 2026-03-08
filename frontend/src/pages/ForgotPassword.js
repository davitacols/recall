import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import TurnstileWidget from "../components/TurnstileWidget";
import api from "../services/api";
import "./AuthPages.css";

function ForgotPassword() {
  const navigate = useNavigate();
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
      <div className="authp-grid">
        <aside className="authp-aside">
          <button type="button" onClick={() => navigate("/")} className="authp-brand">
            <BrandLogo tone="dark" size="lg" />
          </button>

          <div>
            <p className="authp-kicker">Account Recovery</p>
            <h1 className="authp-headline">Reset access without losing momentum.</h1>
            <p className="authp-copy">
              Enter your email and we will send a secure reset link to restore account access.
            </p>
          </div>

          <div className="authp-list">
            <div className="authp-list-item">
              <strong>Secure by default</strong>
              <span>Recovery links are short-lived and bound to your account.</span>
            </div>
            <div className="authp-list-item">
              <strong>Fast recovery</strong>
              <span>Get back into your workspace with minimal friction.</span>
            </div>
          </div>
        </aside>

        <main className="authp-main">
          <section className="authp-card">
            <header>
              <h2 className="authp-title">Reset your password</h2>
              <p className="authp-subtitle">
                Enter your account email and we will send a reset link.
              </p>
            </header>

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
              <Link to="/login" className="authp-link">
                Back to sign in
              </Link>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

export default ForgotPassword;
