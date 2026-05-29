import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  AuthLayout,
  Button,
  Field,
  SectionMessage,
} from "../components/atlas";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(5);

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
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email tied to your Knoledgr account and we'll send a reset link."
    >
      {message ? (
        <SectionMessage tone="success" title="Check your inbox">
          {message} <br />
          Redirecting to sign-in in {seconds}…
        </SectionMessage>
      ) : (
        <>
          {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Email" isRequired>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="atlas-input"
                autoComplete="email"
                required
                autoFocus
              />
            </Field>
            <Button type="submit" appearance="primary" fullWidth isDisabled={loading || !email.trim()}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--app-muted)" }}>
        Remembered it?{" "}
        <Link to="/login" style={{ color: "var(--app-link)" }}>Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
