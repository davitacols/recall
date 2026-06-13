import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(3);

  const checks = useMemo(
    () => [
      { key: "len", label: "At least 8 characters", valid: password.length >= 8 },
      { key: "upper", label: "One uppercase letter", valid: /[A-Z]/.test(password) },
      { key: "lower", label: "One lowercase letter", valid: /[a-z]/.test(password) },
      { key: "digit", label: "One number", valid: /\d/.test(password) },
    ],
    [password]
  );

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
    };
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    setSeconds(3);
    const tick = setInterval(() => setSeconds((s) => (s > 1 ? s - 1 : 1)), 1000);
    const redirect = setTimeout(() => navigate("/login"), 3000);
    return () => {
      clearInterval(tick);
      clearTimeout(redirect);
    };
  }, [message, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!uid || !token) {
      setError("Invalid reset link.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (checks.some((c) => !c.valid)) {
      setError("Password does not meet requirements.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password/", { uid, token, password });
      setMessage(res.data?.message || "Password reset. You can now sign in.");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to reset password.");
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
            <h1 className="lg-title">Set a new password</h1>
            <p className="lg-subtitle">Choose a strong password that you haven't used before.</p>
          </div>

          {message ? (
            <div className="lg-success" role="status">
              <strong>Password updated.</strong>
              <p>{message}</p>
              <p className="lg-success-meta">Redirecting in {seconds}…</p>
            </div>
          ) : (
            <>
              {error ? <div className="lg-error" role="alert">{error}</div> : null}
              <form onSubmit={handleSubmit} className="lg-form">
                <label className="lg-field">
                  <span className="lg-label">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lg-input"
                    autoComplete="new-password"
                    required
                    autoFocus
                  />
                </label>
                <label className="lg-field">
                  <span className="lg-label">Confirm password</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="lg-input"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <ul className="lg-checks">
                  {checks.map((c) => (
                    <li key={c.key} className={`lg-check ${c.valid ? "is-valid" : ""}`}>
                      <CheckIcon /> {c.label}
                    </li>
                  ))}
                </ul>
                <button type="submit" className="lg-submit" disabled={loading}>
                  {loading ? "Saving…" : "Update password"}
                </button>
              </form>
            </>
          )}

          <p className="lg-foot-line">
            <Link to="/login" className="lg-link">Back to sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
