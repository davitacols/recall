import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import TurnstileWidget from "../components/TurnstileWidget";
import api from "../services/api";
import "./AuthPages.css";

function Field({ label, children }) {
  return (
    <label className="authp-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    username: "",
    email: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileEnabled = Boolean(process.env.REACT_APP_TURNSTILE_SITE_KEY);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete bot verification.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/api/organizations/signup/", {
        ...formData,
        turnstile_token: turnstileToken,
      });
      localStorage.setItem("access_token", response.data.access_token);
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authp-shell">
      <div className="authp-grid">
        <aside className="authp-aside">
          <button type="button" onClick={() => navigate("/")} className="authp-brand">
            <BrandLogo tone="dark" size="lg" />
          </button>

          <div>
            <p className="authp-kicker">Workspace Onboarding</p>
            <h1 className="authp-headline">Create your organization workspace.</h1>
            <p className="authp-copy">
              Bring decisions, documentation, and execution context into one durable
              operating layer.
            </p>
          </div>

          <div className="authp-list">
            <div className="authp-list-item">
              <strong>Centralized memory</strong>
              <span>Keep rationale and outcomes attached to every key decision.</span>
            </div>
            <div className="authp-list-item">
              <strong>Cross-team alignment</strong>
              <span>Product, operations, and leadership stay on the same timeline.</span>
            </div>
            <div className="authp-list-item">
              <strong>Searchable history</strong>
              <span>Recover what happened and why in seconds, not hours.</span>
            </div>
          </div>
        </aside>

        <main className="authp-main">
          <section className="authp-card">
            <header>
              <h2 className="authp-title">Create your workspace account</h2>
              <p className="authp-subtitle">
                Set up your organization and start your first workspace.
              </p>
            </header>

            {error ? <div className="authp-error" role="alert">{error}</div> : null}

            <form onSubmit={handleSubmit} className="authp-form" aria-busy={loading}>
              <Field label="Organization Name">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Acme Inc."
                  required
                />
              </Field>

              <Field label="Organization Slug">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  placeholder="acme-inc"
                  required
                />
              </Field>

              <Field label="Full Name">
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  placeholder="Jane Doe"
                  required
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="you@company.com"
                  required
                />
              </Field>

              <Field label="Username">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, username: event.target.value }))
                  }
                  placeholder="janedoe"
                  required
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="********"
                  required
                />
              </Field>

              {turnstileEnabled ? (
                <div className="authp-turnstile">
                  <TurnstileWidget
                    theme="dark"
                    onVerify={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                  />
                </div>
              ) : null}

              <button type="submit" disabled={loading} className="authp-submit">
                {loading ? (
                  <>
                    <span className="authp-spinner" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  "Create workspace account"
                )}
              </button>
            </form>

            <footer className="authp-foot">
              <p>
                Already have an account? <Link to="/login" className="authp-link">Sign in</Link>
              </p>
              <button type="button" onClick={() => navigate("/")} className="authp-back">
                {"<"} Back to homepage
              </button>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Signup;
