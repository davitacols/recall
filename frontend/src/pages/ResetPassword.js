import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  AuthLayout,
  Button,
  Field,
  SectionMessage,
} from "../components/atlas";

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
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password that you haven't used before."
    >
      {message ? (
        <SectionMessage tone="success" title="Password updated">
          {message} Redirecting in {seconds}…
        </SectionMessage>
      ) : (
        <>
          {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="New password" isRequired>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="atlas-input"
                autoComplete="new-password"
                required
                autoFocus
              />
            </Field>
            <Field label="Confirm password" isRequired>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="atlas-input"
                autoComplete="new-password"
                required
              />
            </Field>
            <ul style={checklist}>
              {checks.map((c) => (
                <li key={c.key} style={{ ...checkItem, color: c.valid ? "var(--g500)" : "var(--app-muted)" }}>
                  <CheckIcon style={{ width: 12, height: 12, opacity: c.valid ? 1 : 0.3 }} />
                  {c.label}
                </li>
              ))}
            </ul>
            <Button type="submit" appearance="primary" fullWidth isDisabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
          </form>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--app-muted)" }}>
        <Link to="/login" style={{ color: "var(--app-link)" }}>Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

const checklist = {
  margin: "4px 0 0",
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
