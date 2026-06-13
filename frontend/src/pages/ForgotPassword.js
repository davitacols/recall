import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
    };
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    setSeconds(5);
    const tick = setInterval(() => setSeconds((s) => (s > 1 ? s - 1 : 1)), 1000);
    const redirect = setTimeout(() => navigate("/login"), 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(redirect);
    };
  }, [message, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password/", { email });
      setMessage(res.data?.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg">
      <header className="lg-top">
        <Link to="/" className="lg-brand" aria-label="Knoledgr home">
          <BrandLogo tone="warm" size="md" />
        </Link>
        <Link to="/login" className="lg-back">← Back to sign in</Link>
      </header>

      <main className="lg-main">
        <div className="lg-card">
          <div className="lg-head">
            <h1 className="lg-title">Reset your password</h1>
            <p className="lg-subtitle">
              Enter the email tied to your Knoledgr account and we'll send a reset link.
            </p>
          </div>

          {message ? (
            <div className="lg-success" role="status">
              <strong>Check your inbox.</strong>
              <p>{message}</p>
              <p className="lg-success-meta">Redirecting to sign-in in {seconds}…</p>
            </div>
          ) : (
            <>
              {error ? <div className="lg-error" role="alert">{error}</div> : null}
              <form onSubmit={handleSubmit} className="lg-form">
                <label className="lg-field">
                  <span className="lg-label">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lg-input"
                    autoComplete="email"
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" className="lg-submit" disabled={loading || !email.trim()}>
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className="lg-foot-line">
            Remembered it? <Link to="/login" className="lg-link">Back to sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
