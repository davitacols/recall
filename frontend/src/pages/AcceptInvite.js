import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

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
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
    };
  }, []);

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

  const shell = (title, subtitle, children) => (
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
            <h1 className="lg-title">{title}</h1>
            <p className="lg-subtitle">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );

  if (loading) {
    return shell("Verifying invitation…", "Just a moment.", (
      <p className="lg-foot-line" style={{ color: "var(--lg-muted)" }}>Loading…</p>
    ));
  }

  if (error && !invitation) {
    return shell("Invitation invalid", error, (
      <button type="button" className="lg-submit" onClick={() => navigate("/login")}>
        Go to sign in
      </button>
    ));
  }

  return shell(
    `Join ${invitation?.organization_name || "the workspace"}`,
    invitation?.inviter_name
      ? `${invitation.inviter_name} invited you to join as ${invitation?.role || "member"}.`
      : "Create your account to accept this invitation.",
    (
      <>
        {error ? <div className="lg-error" role="alert">{error}</div> : null}

        <form onSubmit={handleAccept} className="lg-form">
          <label className="lg-field">
            <span className="lg-label">Email</span>
            <input
              type="email"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="lg-input"
              disabled={!!invitation?.email}
              required
            />
          </label>
          <label className="lg-field">
            <span className="lg-label">Full name</span>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="lg-input"
              required
              autoFocus
            />
          </label>
          <label className="lg-field">
            <span className="lg-label">Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="lg-input"
              autoComplete="new-password"
              required
            />
          </label>
          <button
            type="submit"
            className="lg-submit"
            disabled={submitting || !form.full_name || !form.password}
          >
            {submitting ? "Joining…" : "Accept invitation"}
          </button>
        </form>

        <p className="lg-foot-line">
          Already have an account? <Link to="/login" className="lg-link">Sign in</Link>
        </p>
      </>
    )
  );
}
