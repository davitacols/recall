import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import "./Feedback.css";

const focusAreas = [
  {
    title: "Product clarity",
    text: "Tell Knoledgr where the workflow feels confusing, crowded, or incomplete so the team can tighten the surface.",
  },
  {
    title: "Execution friction",
    text: "Report places where projects, issues, sprints, or decisions are slowing teams down in practice.",
  },
  {
    title: "Knowledge quality",
    text: "Call out where Ask Recall, search, docs, or linked memory need deeper coverage and more credible answers.",
  },
];

const feedbackTypeOptions = [
  { value: "general", label: "General product feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "docs", label: "Documentation" },
  { value: "pricing", label: "Pricing or upgrade" },
  { value: "support", label: "Support or onboarding" },
  { value: "testimonial", label: "Testimonial" },
];

const sentimentOptions = [
  { value: "positive", label: "Working well" },
  { value: "neutral", label: "Mixed or neutral" },
  { value: "friction", label: "Needs improvement" },
];

const ratingOptions = [
  { value: 5, label: "5 - Excellent" },
  { value: 4, label: "4 - Good" },
  { value: 3, label: "3 - Fair" },
  { value: 2, label: "2 - Rough" },
  { value: 1, label: "1 - Broken" },
];

function buildInitialForm(user) {
  return {
    full_name: user?.full_name || user?.name || "",
    email: user?.email || "",
    company_name: user?.organization_name || "",
    role_title: "",
    feedback_type: "general",
    sentiment: "neutral",
    rating: 4,
    current_page: "",
    message: "",
    consent_to_contact: false,
    fax_number: "",
  };
}

export default function Feedback() {
  const { user } = useAuth();
  const appEntryHref = user ? "/dashboard" : "/login";
  const [formData, setFormData] = React.useState(() => buildInitialForm(user));
  const [submitState, setSubmitState] = React.useState("idle");
  const [submitMessage, setSubmitMessage] = React.useState("");

  React.useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () =>
      document.documentElement.setAttribute(
        "data-theme",
        saved || localStorage.getItem("theme") || "light"
      );
  }, []);

  React.useEffect(() => {
    if (!user) return;
    setFormData((current) => ({
      ...current,
      full_name: current.full_name || user.full_name || user.name || "",
      email: current.email || user.email || "",
      company_name: current.company_name || user.organization_name || "",
    }));
  }, [user]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitState === "submitting") return;

    setSubmitState("submitting");
    setSubmitMessage("");

    try {
      const response = await api.post("/api/organizations/feedback/", formData, {
        skipAuthRedirect: true,
      });
      setSubmitState("success");
      setSubmitMessage(response.data?.message || "Feedback received.");
      setFormData((current) => ({
        ...buildInitialForm(user),
        full_name: current.full_name,
        email: current.email,
        company_name: current.company_name,
      }));
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error.response?.data?.error || "We could not submit your feedback right now.");
    }
  };

  return (
    <div className="feedback-page" data-theme="light">
      <div className="feedback-texture" />
      <div className="feedback-glow feedback-glow-a" />
      <div className="feedback-glow feedback-glow-b" />

      <header className="feedback-header">
        <div className="feedback-shell feedback-header-row">
          <Link to="/" className="feedback-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="warm" size="lg" />
          </Link>

          <div className="feedback-header-actions">
            <Link to="/" className="feedback-btn feedback-btn-ghost">
              Home
            </Link>
            <Link to="/docs" className="feedback-btn feedback-btn-ghost">
              Documentation
            </Link>
            <Link to={appEntryHref} className="feedback-btn feedback-btn-primary">
              {user ? "Open app" : "Start free"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="feedback-hero">
          <div className="feedback-shell feedback-hero-grid">
            <div className="feedback-hero-copy">
              <p className="feedback-eyebrow">Feedback</p>
              <h1>Help shape what Knoledgr gets better next.</h1>
              <p className="feedback-lead">
                Send product feedback, bug reports, feature requests, docs gaps, and onboarding friction
                straight to the Knoledgr review queue. The team can triage, assign, and resolve it without
                losing the original context.
              </p>

              <div className="feedback-actions">
                <a href="#feedback-form" className="feedback-btn feedback-btn-primary feedback-btn-lg">
                  Share feedback
                </a>
                <Link to="/docs" className="feedback-btn feedback-btn-ghost feedback-btn-lg">
                  Read the docs
                </Link>
              </div>

              <div className="feedback-stat-grid">
                <article className="feedback-stat-card">
                  <p className="feedback-stat-value">7</p>
                  <p className="feedback-stat-label">feedback lanes supported</p>
                </article>
                <article className="feedback-stat-card">
                  <p className="feedback-stat-value">1</p>
                  <p className="feedback-stat-label">shared inbox for product triage</p>
                </article>
                <article className="feedback-stat-card">
                  <p className="feedback-stat-value">5</p>
                  <p className="feedback-stat-label">rating levels for product quality signal</p>
                </article>
              </div>
            </div>

            <aside className="feedback-hero-panel">
              <div className="feedback-panel-head">
                <div>
                  <p className="feedback-kicker">Best feedback</p>
                  <h2>Specific, grounded, and tied to a real workflow.</h2>
                </div>
                <span className="feedback-pill">Product and docs</span>
              </div>

              <div className="feedback-card-grid">
                {focusAreas.map((area) => (
                  <article key={area.title} className="feedback-card">
                    <h3>{area.title}</h3>
                    <p>{area.text}</p>
                  </article>
                ))}
              </div>

              <div className="feedback-note-card">
                <p className="feedback-kicker">What helps most</p>
                <p>
                  Include the page, workflow, or feature you were using, what you expected to happen, and
                  what actually slowed you down or worked especially well.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="feedback-section feedback-section-tight" id="feedback-form">
          <div className="feedback-shell feedback-two-column">
            <div className="feedback-section-copy">
              <p>Product feedback</p>
              <h2>Tell the team what is working, what is missing, or what needs fixing.</h2>
              <p>
                This form works for public visitors and signed-in users. If you already have a workspace, use
                the same contact details you use in Knoledgr so the product team can connect the feedback to
                the right organization context when needed.
              </p>

              <div className="feedback-card-grid">
                <article className="feedback-card">
                  <h3>Good bug reports</h3>
                  <p>Point to the page or feature, describe the break clearly, and mention whether it blocks work.</p>
                </article>
                <article className="feedback-card">
                  <h3>Good feature requests</h3>
                  <p>Explain the workflow gap, not just the UI change, so the team can design the right fix.</p>
                </article>
              </div>
            </div>

            <div className="feedback-form-card">
              <div className="feedback-form-head">
                <p className="feedback-kicker">Share feedback</p>
                <h3>Feedback form</h3>
                <p>Give the Knoledgr team enough context to reproduce the issue or understand the request.</p>
              </div>

              <form onSubmit={handleSubmit} className="feedback-form">
                <div className="feedback-form-grid">
                  <label className="feedback-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Jordan Miles"
                      required
                    />
                  </label>

                  <label className="feedback-field">
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jordan@team.com"
                      required
                    />
                  </label>

                  <label className="feedback-field">
                    <span>Company or workspace</span>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Northstar Studio"
                    />
                  </label>

                  <label className="feedback-field">
                    <span>Role</span>
                    <input
                      type="text"
                      name="role_title"
                      value={formData.role_title}
                      onChange={handleChange}
                      placeholder="Founder, PM, Engineer, Ops Lead"
                    />
                  </label>

                  <label className="feedback-field">
                    <span>Feedback type</span>
                    <select name="feedback_type" value={formData.feedback_type} onChange={handleChange} required>
                      {feedbackTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="feedback-field">
                    <span>Experience signal</span>
                    <select name="sentiment" value={formData.sentiment} onChange={handleChange} required>
                      {sentimentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="feedback-field">
                    <span>Rating</span>
                    <select name="rating" value={formData.rating} onChange={handleChange} required>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="feedback-field">
                    <span>Area or page</span>
                    <input
                      type="text"
                      name="current_page"
                      value={formData.current_page}
                      onChange={handleChange}
                      placeholder="/ask, /projects/justice-app, docs, onboarding"
                    />
                  </label>
                </div>

                <label className="feedback-field">
                  <span>What should the team know?</span>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={7}
                    placeholder="Describe what you were trying to do, what worked or failed, and what a better outcome would look like."
                    required
                  />
                </label>

                <label className="feedback-checkbox">
                  <input
                    type="checkbox"
                    name="consent_to_contact"
                    checked={formData.consent_to_contact}
                    onChange={handleChange}
                  />
                  <span>Knoledgr may contact me about this feedback if follow-up is helpful.</span>
                </label>

                <div className="feedback-honeypot" aria-hidden="true">
                  <label>
                    Fax number
                    <input
                      type="text"
                      name="fax_number"
                      value={formData.fax_number}
                      onChange={handleChange}
                      tabIndex="-1"
                      autoComplete="off"
                    />
                  </label>
                </div>

                {submitMessage ? (
                  <div
                    className={`feedback-form-status ${
                      submitState === "success" ? "feedback-form-status-success" : "feedback-form-status-error"
                    }`}
                  >
                    {submitMessage}
                  </div>
                ) : null}

                <div className="feedback-form-actions">
                  <button
                    type="submit"
                    className="feedback-btn feedback-btn-primary feedback-btn-lg"
                    disabled={submitState === "submitting"}
                  >
                    {submitState === "submitting" ? "Submitting..." : "Send feedback"}
                  </button>
                  <span className="feedback-form-helper">
                    Need support instead? <a href="mailto:support@knoledgr.com">Email support</a>
                  </span>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="feedback-cta">
          <div className="feedback-shell feedback-cta-panel">
            <p>The strongest product feedback is tied to real work.</p>
            <h2>Show the team where Knoledgr is helping and where it still gets in the way.</h2>
            <div className="feedback-actions">
              <a href="#feedback-form" className="feedback-btn feedback-btn-primary feedback-btn-lg">
                Share feedback
              </a>
              <Link to={appEntryHref} className="feedback-btn feedback-btn-ghost feedback-btn-lg">
                {user ? "Open app" : "Start free"}
              </Link>
            </div>
          </div>

          <div className="feedback-shell feedback-footer-links">
            <Link to="/">Home</Link>
            <Link to="/docs">Documentation</Link>
            <Link to="/partners">Partners</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/security-annex">Security Annex</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
