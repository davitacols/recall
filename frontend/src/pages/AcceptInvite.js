import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AuthLayout,
  Button,
  Field,
  SectionMessage,
} from "../components/atlas";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_URL || "";

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${apiBase}/api/organizations/invitations/${token}/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok) {
          setInvitation(data);
          if (data?.email) setForm((f) => ({ ...f, username: data.email }));
        } else {
          setError(data.error || "Invalid invitation");
        }
      } catch (_) {
        setError("Invalid invitation");
      } finally {
        setLoading(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAccept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/organizations/invitations/${token}/accept/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (_) {
      setError("Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Verifying invitation…" subtitle="Just a moment.">
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--app-muted)" }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid var(--n40)", borderTopColor: "var(--b400)", animation: "spin 1s linear infinite" }} />
          Loading…
        </div>
      </AuthLayout>
    );
  }

  if (error && !invitation) {
    return (
      <AuthLayout title="Invitation invalid" subtitle={error}>
        <Button appearance="primary" fullWidth onClick={() => navigate("/login")}>
          Go to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`Join ${invitation?.organization_name || "the workspace"}`}
      subtitle={
        invitation?.inviter_name
          ? `${invitation.inviter_name} invited you to join as ${invitation?.role || "member"}.`
          : "Create your account to accept this invitation."
      }
    >
      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      <form onSubmit={handleAccept} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Email" isRequired>
          <input
            type="email"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="atlas-input"
            disabled={!!invitation?.email}
            required
          />
        </Field>
        <Field label="Full name" isRequired>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="atlas-input"
            required
            autoFocus
          />
        </Field>
        <Field label="Password" isRequired>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="atlas-input"
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" appearance="primary" fullWidth isDisabled={submitting || !form.full_name || !form.password}>
          {submitting ? "Joining…" : "Accept invitation"}
        </Button>
      </form>

      <p style={{ marginTop: 16, fontSize: 13, color: "var(--app-muted)" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--app-link)" }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}
