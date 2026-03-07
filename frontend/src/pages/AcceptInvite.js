import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import TurnstileWidget from "../components/TurnstileWidget";

function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

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

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#0f0b0d",
            panel: "var(--app-surface)",
            panelAlt: "var(--app-surface-alt)",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            danger: "var(--app-danger)",
          }
        : {
            bg: "var(--app-bg)",
            panel: "var(--app-surface-alt)",
            panelAlt: "#f8fbff",
            border: "var(--app-border)",
            text: "var(--app-text)",
            muted: "var(--app-muted)",
            accent: "var(--app-accent)",
            danger: "var(--app-danger)",
          },
    [darkMode]
  );

  useEffect(() => {
    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
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

  const handleAccept = async (event) => {
    event.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete bot verification.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/organizations/invitations/${token}/accept/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          turnstile_token: turnstileToken,
        }),
      });
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
      <div style={centerWrap(palette)}>
        <div style={{ ...panel(palette), width: 420, textAlign: "center" }}>
          <div style={spinner(palette)} />
          <p style={{ margin: "10px 0 0", color: palette.muted }}>Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={centerWrap(palette)}>
        <div style={{ ...panel(palette), width: 460, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 28, color: palette.text }}>Invitation Invalid</h1>
          <p style={{ margin: "10px 0 18px", color: palette.muted }}>{error}</p>
          <button onClick={() => navigate("/login")} style={secondaryBtn(palette)}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={centerWrap(palette)}>
      <div
        style={{
          width: "min(980px, 94vw)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        <section
          style={{
            ...panel(palette),
            background: darkMode
              ? "linear-gradient(140deg, rgba(59,130,246,0.2), rgba(249,115,22,0.18) 55%, rgba(34,197,94,0.12))"
              : "linear-gradient(140deg, rgba(191,219,254,0.72), rgba(255,225,196,0.78) 55%, rgba(209,250,229,0.75))",
          }}
        >
          <p style={{ ...eyebrow(palette), marginTop: 0 }}>WORKSPACE INVITATION</p>
          <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(1.6rem, 3.4vw, 2.3rem)", color: palette.text }}>
            Join {invitation.organization}
          </h1>
          <p style={{ margin: "0 0 14px", color: palette.muted }}>
            You were invited as <strong style={{ color: palette.text }}>{invitation.role}</strong>. Complete your account
            setup to continue.
          </p>
          <div style={{ ...metaCard(palette), marginBottom: 8 }}>
            <p style={metaLabel(palette)}>Email</p>
            <p style={metaValue(palette)}>{invitation.email}</p>
          </div>
          <div style={metaCard(palette)}>
            <p style={metaLabel(palette)}>Role</p>
            <p style={metaValue(palette)}>{invitation.role}</p>
          </div>
        </section>

        <section style={panel(palette)}>
          <h2 style={{ margin: "0 0 4px", color: palette.text }}>Create your account</h2>
          <p style={{ margin: "0 0 14px", color: palette.muted }}>This takes less than a minute.</p>

          {error && (
            <div
              style={{
                marginBottom: 12,
                border: `1px solid ${palette.danger}`,
                borderRadius: 10,
                background: darkMode ? "var(--app-danger-soft)" : "var(--app-danger-soft)",
                color: palette.danger,
                padding: "9px 10px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleAccept} style={{ display: "grid", gap: 10 }}>
            <Field
              label="Full Name"
              value={formData.full_name}
              onChange={(value) => setFormData((prev) => ({ ...prev, full_name: value }))}
              palette={palette}
            />
            <Field
              label="Username"
              value={formData.username}
              onChange={(value) => setFormData((prev) => ({ ...prev, username: value }))}
              palette={palette}
            />
            <Field label="Email" value={invitation.email} palette={palette} disabled />
            <Field
              label="Password"
              value={formData.password}
              onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
              palette={palette}
              type="password"
            />
            {turnstileEnabled && (
              <TurnstileWidget
                theme={darkMode ? "dark" : "light"}
                onVerify={(tokenValue) => setTurnstileToken(tokenValue)}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
              />
            )}

            <button type="submit" disabled={submitting} style={{ ...primaryBtn(palette), opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Creating account..." : "Accept Invitation"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, palette, type = "text", disabled = false }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={fieldLabel(palette)}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        required={!disabled}
        style={{
          ...fieldInput(palette),
          background: disabled ? (palette.panelAlt || "#f8fafc") : palette.panelAlt,
          opacity: disabled ? 0.86 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </label>
  );
}

const centerWrap = (palette) => ({
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
});

const panel = (palette) => ({
  borderRadius: 16,
  border: `1px solid ${palette.border}`,
  background: palette.panel,
  padding: "18px 18px 16px",
  boxShadow: "0 14px 34px rgba(2,6,23,0.08)",
});

const eyebrow = (palette) => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: palette.muted,
});

const metaCard = (palette) => ({
  border: `1px solid ${palette.border}`,
  borderRadius: 12,
  padding: "10px 12px",
  background: palette.panelAlt,
});

const metaLabel = (palette) => ({
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: palette.muted,
  fontWeight: 700,
});

const metaValue = (palette) => ({
  margin: "4px 0 0",
  fontSize: 14,
  color: palette.text,
  fontWeight: 700,
});

const fieldLabel = (palette) => ({
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: palette.muted,
});

const fieldInput = (palette) => ({
  borderRadius: 10,
  border: `1px solid ${palette.border}`,
  padding: "11px 12px",
  fontSize: 14,
  color: palette.text,
  outline: "none",
});

const primaryBtn = (palette) => ({
  marginTop: 4,
  border: "none",
  borderRadius: 12,
  padding: "11px 14px",
  background: "var(--app-gradient-primary)",
  color: "var(--app-button-text)",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
});

const secondaryBtn = (palette) => ({
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  background: palette.panelAlt,
  color: palette.text,
  fontWeight: 700,
  cursor: "pointer",
});

const spinner = (palette) => ({
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: `2px solid ${palette.border}`,
  borderTopColor: palette.accent,
  margin: "0 auto",
  animation: "spin 1s linear infinite",
});

export default AcceptInvite;

