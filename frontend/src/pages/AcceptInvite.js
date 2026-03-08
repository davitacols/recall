import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import TurnstileWidget from "../components/TurnstileWidget";
import "./AuthPages.css";

function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label className="authp-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        required={!disabled}
      />
    </label>
  );
}

function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = Boolean(process.env.REACT_APP_TURNSTILE_SITE_KEY);

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        const data = await response.json();
        if (response.ok) {
          setInvitation(data);
        } else {
          setError(data.error || "Invalid invitation");
        }
      } catch (_) {
        setError("Invalid invitation");
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const handleAccept = async (event) => {
    event.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete bot verification.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/accept/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            turnstile_token: turnstileToken,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/";
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
      <div className="authp-shell authp-centered">
        <section className="authp-card authp-status-card">
          <div className="authp-spinner authp-spinner-lg" aria-hidden="true" />
          <p className="authp-subtitle">Verifying invitation...</p>
        </section>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="authp-shell authp-centered">
        <section className="authp-card authp-status-card">
          <h1 className="authp-title">Invitation invalid</h1>
          <p className="authp-subtitle">{error}</p>
          <button type="button" onClick={() => navigate("/login")} className="authp-secondary-btn">
            Go to sign in
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="authp-shell">
      <div className="authp-grid authp-grid-invite">
        <aside className="authp-aside">
          <button type="button" onClick={() => navigate("/")} className="authp-brand">
            <BrandLogo tone="dark" size="lg" />
          </button>

          <div>
            <p className="authp-kicker">Workspace Invitation</p>
            <h1 className="authp-headline">Join {invitation.organization}.</h1>
            <p className="authp-copy">
              You were invited as {invitation.role}. Finish setup to join your team workspace.
            </p>
          </div>

          <div className="authp-list">
            <div className="authp-list-item">
              <strong>Invited email</strong>
              <span>{invitation.email}</span>
            </div>
            <div className="authp-list-item">
              <strong>Role</strong>
              <span>{invitation.role}</span>
            </div>
          </div>
        </aside>

        <main className="authp-main">
          <section className="authp-card">
            <header>
              <h2 className="authp-title">Create your account</h2>
              <p className="authp-subtitle">This takes less than a minute.</p>
            </header>

            {error ? <div className="authp-error" role="alert">{error}</div> : null}

            <form onSubmit={handleAccept} className="authp-form" aria-busy={submitting}>
              <Field
                label="Full Name"
                value={formData.full_name}
                onChange={(value) => setFormData((prev) => ({ ...prev, full_name: value }))}
              />
              <Field
                label="Username"
                value={formData.username}
                onChange={(value) => setFormData((prev) => ({ ...prev, username: value }))}
              />
              <Field label="Email" value={invitation.email} disabled />
              <Field
                label="Password"
                value={formData.password}
                onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
                type="password"
              />

              {turnstileEnabled ? (
                <div className="authp-turnstile">
                  <TurnstileWidget
                    theme="dark"
                    onVerify={(tokenValue) => setTurnstileToken(tokenValue)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </div>
              ) : null}

              <button type="submit" disabled={submitting} className="authp-submit">
                {submitting ? (
                  <>
                    <span className="authp-spinner" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  "Accept invitation"
                )}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AcceptInvite;
