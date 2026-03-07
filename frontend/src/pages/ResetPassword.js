import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (checks.some((c) => !c.valid)) {
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

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={title}>Set New Password</h1>
        <p style={subtitle}>Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} style={form}>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            style={input}
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            style={input}
          />
          <div style={checkWrap}>
            {checks.map((check) => (
              <div key={check.label} style={{ ...checkRow, color: check.valid ? "#87e7b4" : "rgba(247,239,227,0.7)" }}>
                <span style={{ ...dot, background: check.valid ? "var(--app-success)" : "rgba(247,239,227,0.35)" }} />
                {check.label}
              </div>
            ))}
          </div>
          {error && <div style={errorBox}>{error}</div>}
          {message && <div style={successBox}>{message}</div>}
          <button type="submit" disabled={loading} style={button(loading)}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <Link to="/login" style={link}>Back to sign in</Link>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #130f11, #1e1518)",
  padding: 16,
};

const card = {
  width: "min(460px, 100%)",
  borderRadius: 16,
  border: "1px solid rgba(255,240,222,0.14)",
  background: "rgba(18,13,15,0.86)",
  padding: 22,
  color: "#f7efe3",
};

const title = { margin: 0, fontSize: 28, letterSpacing: "-0.02em" };
const subtitle = { marginTop: 8, marginBottom: 16, color: "rgba(247,239,227,0.76)", fontSize: 14 };
const form = { display: "grid", gap: 10 };
const input = {
  borderRadius: 10,
  border: "1px solid rgba(255,240,222,0.14)",
  background: "var(--app-info-soft)",
  color: "#f7efe3",
  padding: "12px 12px",
  fontSize: 15,
  outline: "none",
};
const checkWrap = {
  border: "1px solid rgba(255,240,222,0.12)",
  borderRadius: 10,
  background: "var(--app-info-soft)",
  padding: "8px 10px",
  display: "grid",
  gap: 5,
};
const checkRow = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12 };
const dot = { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 };
const errorBox = {
  borderRadius: 8,
  border: "1px solid rgba(255,111,97,0.6)",
  background: "rgba(255,111,97,0.12)",
  color: "#ffd3ce",
  padding: "8px 10px",
  fontSize: 13,
};
const successBox = {
  borderRadius: 8,
  border: "1px solid rgba(34,197,94,0.5)",
  background: "rgba(34,197,94,0.12)",
  color: "#bbf7d0",
  padding: "8px 10px",
  fontSize: 13,
};
const button = (loading) => ({
  border: "none",
  borderRadius: 10,
  padding: "11px 12px",
  cursor: loading ? "not-allowed" : "pointer",
  background: "var(--app-gradient-primary)",
  color: "var(--app-button-text)",
  fontWeight: 700,
  fontSize: 14,
  opacity: loading ? 0.65 : 1,
});
const link = { color: "#ffd390", textDecoration: "none", fontSize: 13, marginTop: 12, display: "inline-block" };

