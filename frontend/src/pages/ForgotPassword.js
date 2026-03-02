import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await api.post("/api/auth/forgot-password/", { email });
      setMessage(response.data?.message || "If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={title}>Forgot Password</h1>
        <p style={subtitle}>Enter your account email and we will send you a reset link.</p>
        <form onSubmit={handleSubmit} style={form}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            style={input}
          />
          {error && <div style={errorBox}>{error}</div>}
          {message && <div style={successBox}>{message}</div>}
          <button type="submit" disabled={loading} style={button(loading)}>
            {loading ? "Sending..." : "Send reset link"}
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
  width: "min(440px, 100%)",
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
  background: "rgba(255,255,255,0.04)",
  color: "#f7efe3",
  padding: "12px 12px",
  fontSize: 15,
  outline: "none",
};
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
  background: "linear-gradient(135deg, #ffd390, #ff9f62)",
  color: "#1f1512",
  fontWeight: 700,
  fontSize: 14,
  opacity: loading ? 0.65 : 1,
});
const link = { color: "#ffd390", textDecoration: "none", fontSize: 13, marginTop: 12, display: "inline-block" };

