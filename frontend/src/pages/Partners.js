import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import "./Partners.css";

const partnerProfiles = [
  {
    title: "Agencies and delivery studios",
    text: "Bring decision memory into client teams that already feel the cost of context loss across product, engineering, and delivery.",
  },
  {
    title: "Fractional operators",
    text: "Give founders and leadership teams a steadier operating layer for decisions, handoffs, and follow-through without adding heavy process.",
  },
  {
    title: "Implementation consultants",
    text: "Pair Knoledgr with Jira, Notion, Confluence, and workflow cleanup projects so context survives after the engagement ends.",
  },
  {
    title: "Platform and ecosystem teams",
    text: "Support portfolio companies or member organizations with a shared system for decisions, execution context, and searchable institutional memory.",
  },
];

const partnerBenefits = [
  {
    title: "A clearer service wedge",
    text: "Lead with decision memory, not another generic productivity rollout. Knoledgr gives partners a distinct story around context recovery and operational continuity.",
  },
  {
    title: "Faster client adoption",
    text: "Teams can start with real routes they already understand: Decisions, Ask Recall, Knowledge Graph, Documents, Projects, and Sprints.",
  },
  {
    title: "Pilot-friendly packaging",
    text: "The strongest entry motion is a guided rollout for one live team, one active initiative, and one clear context problem to fix.",
  },
  {
    title: "Longer-lived value",
    text: "Partners are not just shipping setup work. They are helping teams keep rationale, records, and execution memory usable over time.",
  },
];

const engagementModels = [
  {
    title: "Referral partner",
    detail: "You identify a team with a real context problem, help frame the opportunity, and bring Knoledgr into the buying conversation.",
    points: [
      "Best for trusted advisors and ecosystem operators.",
      "Works well when you influence software and operating-model decisions.",
    ],
  },
  {
    title: "Implementation partner",
    detail: "You lead onboarding, workspace structure, knowledge linking, and workflow mapping so the team gets early signal quickly.",
    points: [
      "Best for agencies, Notion/Jira consultants, and ops advisors.",
      "Strong fit when you already run delivery, documentation, or tooling engagements.",
    ],
  },
  {
    title: "Embedded rollout partner",
    detail: "You bring Knoledgr into a broader transformation or operating-system engagement as the memory layer behind the work.",
    points: [
      "Best for fractional leaders and strategic operators.",
      "Strong fit when the client needs both product change and behavioral change.",
    ],
  },
];

const productAngles = [
  {
    name: "Decisions",
    text: "Capture rationale, tradeoffs, approvals, and outcome reviews instead of letting the why disappear into meetings and chat.",
  },
  {
    name: "Ask Recall",
    text: "Answer grounded questions about the organization from real workspace history instead of relying on generic memory or retold context.",
  },
  {
    name: "Knowledge Graph",
    text: "Show how conversations, documents, projects, issues, and decisions connect so context is visible, not implied.",
  },
  {
    name: "Execution context",
    text: "Keep projects, sprints, blockers, and issues attached to the decision trail behind the work so delivery shifts make sense.",
  },
];

const rolloutSteps = [
  "Choose one client team with active delivery pressure and visible context loss.",
  "Start with a guided pilot around decisions, linked work, and one live initiative.",
  "Attach conversations, documents, projects, issues, and sprint flow to the same operating record.",
  "Use Ask Recall and the Knowledge Graph to turn captured context into repeatable team memory.",
];

const partnerTypeOptions = [
  { value: "agency", label: "Agency or studio" },
  { value: "fractional", label: "Fractional operator" },
  { value: "consultant", label: "Implementation consultant" },
  { value: "ecosystem", label: "Platform or ecosystem team" },
];

function buildInitialForm(user) {
  return {
    full_name: user?.full_name || user?.name || "",
    work_email: user?.email || "",
    company_name: user?.organization_name || "",
    role_title: "",
    partner_type: "agency",
    website: "",
    service_summary: "",
    consent_to_contact: false,
    fax_number: "",
  };
}

export default function Partners() {
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
      work_email: current.work_email || user.email || "",
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
      const response = await api.post("/api/organizations/partner-inquiries/", formData, {
        skipAuthRedirect: true,
      });
      setSubmitState("success");
      setSubmitMessage(response.data?.message || "Partner inquiry received.");
      setFormData((current) => ({
        ...buildInitialForm(user),
        full_name: current.full_name,
        work_email: current.work_email,
        company_name: current.company_name,
      }));
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error.response?.data?.error || "We could not submit your request right now.");
    }
  };

  return (
    <div className="partners-page" data-theme="light">
      <div className="partners-texture" />
      <div className="partners-glow partners-glow-a" />
      <div className="partners-glow partners-glow-b" />

      <header className="partners-header">
        <div className="partners-shell partners-header-row">
          <Link to="/" className="partners-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="warm" size="lg" />
          </Link>

          <div className="partners-header-actions">
            <Link to="/" className="partners-btn partners-btn-ghost">
              Home
            </Link>
            <Link to="/docs" className="partners-btn partners-btn-ghost">
              Documentation
            </Link>
            <Link to={appEntryHref} className="partners-btn partners-btn-primary">
              {user ? "Open app" : "Start free"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="partners-hero">
          <div className="partners-shell partners-hero-grid">
            <div className="partners-hero-copy">
              <p className="partners-eyebrow">Partner Program</p>
              <h1>Help teams keep the why behind the work.</h1>
              <p className="partners-lead">
                Knoledgr partners with agencies, operators, and ecosystem teams that already help clients
                clean up execution, documentation, and decision sprawl. We give them a stronger memory
                layer to roll out with the work.
              </p>

              <div className="partners-actions">
                <a href="#partner-inquiry" className="partners-btn partners-btn-primary partners-btn-lg">
                  Apply as a partner
                </a>
                <a href="#program" className="partners-btn partners-btn-ghost partners-btn-lg">
                  See the program
                </a>
              </div>

              <div className="partners-stat-grid">
                <article className="partners-stat-card">
                  <p className="partners-stat-value">3</p>
                  <p className="partners-stat-label">core partner motions</p>
                </article>
                <article className="partners-stat-card">
                  <p className="partners-stat-value">1</p>
                  <p className="partners-stat-label">guided pilot to prove value fast</p>
                </article>
                <article className="partners-stat-card">
                  <p className="partners-stat-value">6</p>
                  <p className="partners-stat-label">shipped product surfaces partners can sell clearly</p>
                </article>
              </div>
            </div>

            <aside className="partners-hero-panel">
              <div className="partners-panel-head">
                <div>
                  <p className="partners-kicker">Where Knoledgr fits</p>
                  <h2>Bring memory into the systems teams already use.</h2>
                </div>
                <span className="partners-pill">For client delivery</span>
              </div>

              <div className="partners-preview">
                <img
                  src="/brand/knoledgr-app-screenshot.svg"
                  alt="Knoledgr workspace preview"
                  className="partners-preview-shot"
                />
                <img
                  src="/brand/knoledgr-memory-orbit.svg"
                  alt=""
                  aria-hidden="true"
                  className="partners-preview-orbit"
                />
              </div>

              <div className="partners-contact-card">
                <p className="partners-kicker">Commercial terms and agreements</p>
                <a href="mailto:legal@knoledgr.com?subject=Knoledgr%20Partner%20Program">
                  legal@knoledgr.com
                </a>
                <p>
                  Use the inquiry form for partner interest and rollout conversations. Route commercial
                  terms, vendor paperwork, and agreement review through the existing legal contact.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="partners-section partners-section-tight" id="partner-inquiry">
          <div className="partners-shell partners-two-column">
            <div className="partners-section-copy">
              <p>Partner inquiry</p>
              <h2>Tell Knoledgr how you work and who you help.</h2>
              <p>
                This form is the fastest way to start a real partner conversation. Share the kind of
                clients you support, where context gets lost today, and what sort of rollout you usually
                lead.
              </p>

              <div className="partners-card-grid">
                <article className="partners-card">
                  <h3>What happens next</h3>
                  <p>
                    Knoledgr reviews each submission, looks for fit with the current partner program, and
                    follows up with pilot, commercial, or enablement next steps.
                  </p>
                </article>
                <article className="partners-card">
                  <h3>Best first pilot</h3>
                  <p>
                    One client team, one active initiative, and one visible context problem is still the
                    strongest way to prove value quickly.
                  </p>
                </article>
              </div>
            </div>

            <div className="partners-form-card">
              <div className="partners-form-head">
                <p className="partners-kicker">Apply to partner</p>
                <h3>Partner inquiry form</h3>
                <p>Share your practice, your client profile, and how you would like to work with Knoledgr.</p>
              </div>

              <form onSubmit={handleSubmit} className="partners-form">
                <div className="partners-form-grid">
                  <label className="partners-field">
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

                  <label className="partners-field">
                    <span>Work email</span>
                    <input
                      type="email"
                      name="work_email"
                      value={formData.work_email}
                      onChange={handleChange}
                      placeholder="jordan@firm.com"
                      required
                    />
                  </label>

                  <label className="partners-field">
                    <span>Company</span>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Northstar Studio"
                      required
                    />
                  </label>

                  <label className="partners-field">
                    <span>Role</span>
                    <input
                      type="text"
                      name="role_title"
                      value={formData.role_title}
                      onChange={handleChange}
                      placeholder="Founder, Fractional COO, Delivery Lead"
                      required
                    />
                  </label>

                  <label className="partners-field">
                    <span>Partner type</span>
                    <select name="partner_type" value={formData.partner_type} onChange={handleChange} required>
                      {partnerTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="partners-field">
                    <span>Website</span>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://northstarstudio.com"
                    />
                  </label>
                </div>

                <label className="partners-field">
                  <span>Your practice and client fit</span>
                  <textarea
                    name="service_summary"
                    value={formData.service_summary}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Tell us what kind of clients you support, where context gets lost today, and how you would want to bring Knoledgr into the work."
                    required
                  />
                </label>

                <label className="partners-checkbox">
                  <input
                    type="checkbox"
                    name="consent_to_contact"
                    checked={formData.consent_to_contact}
                    onChange={handleChange}
                    required
                  />
                  <span>Knoledgr can contact me about the partner program and a potential pilot.</span>
                </label>

                <div className="partners-honeypot" aria-hidden="true">
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
                    className={`partners-form-status ${
                      submitState === "success" ? "partners-form-status-success" : "partners-form-status-error"
                    }`}
                  >
                    {submitMessage}
                  </div>
                ) : null}

                <div className="partners-form-actions">
                  <button
                    type="submit"
                    className="partners-btn partners-btn-primary partners-btn-lg"
                    disabled={submitState === "submitting"}
                  >
                    {submitState === "submitting" ? "Submitting..." : "Send partner inquiry"}
                  </button>
                  <span className="partners-form-helper">
                    Need legal paperwork first?{" "}
                    <a href="mailto:legal@knoledgr.com?subject=Knoledgr%20Partner%20Program">Request terms</a>
                  </span>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="partners-section" id="program">
          <div className="partners-shell">
            <div className="partners-section-head">
              <p>Best-fit partners</p>
              <h2>The strongest partners already sit inside context-heavy work.</h2>
            </div>

            <div className="partners-card-grid partners-card-grid-four">
              {partnerProfiles.map((profile) => (
                <article key={profile.title} className="partners-card">
                  <h3>{profile.title}</h3>
                  <p>{profile.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="partners-section partners-section-tight">
          <div className="partners-shell partners-two-column">
            <div>
              <div className="partners-section-head">
                <p>Why this works</p>
                <h2>Knoledgr gives partners a sharper story than generic knowledge tooling.</h2>
              </div>

              <div className="partners-card-grid">
                {partnerBenefits.map((benefit) => (
                  <article key={benefit.title} className="partners-card">
                    <h3>{benefit.title}</h3>
                    <p>{benefit.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="partners-note-card">
              <p className="partners-kicker">What to lead with</p>
              <h3>Decision memory for teams</h3>
              <p>
                The best partner conversations start with a real pain point: repeated debates, scattered
                rationale, sprint drift, onboarding friction, or missing context during execution.
              </p>
              <ul>
                {rolloutSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="partners-section">
          <div className="partners-shell">
            <div className="partners-section-head">
              <p>Engagement models</p>
              <h2>Three ways to partner without forcing the same motion on everyone.</h2>
            </div>

            <div className="partners-card-grid partners-card-grid-three">
              {engagementModels.map((model) => (
                <article key={model.title} className="partners-card partners-card-tall">
                  <h3>{model.title}</h3>
                  <p>{model.detail}</p>
                  <ul>
                    {model.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="partners-section partners-section-tight">
          <div className="partners-shell partners-two-column">
            <div className="partners-section-copy">
              <p>What clients actually get</p>
              <h2>Partners can sell Knoledgr through product surfaces that already exist.</h2>
              <p>
                The partner story should map to real routes and real value. That makes demos cleaner,
                onboarding faster, and client expectations easier to manage.
              </p>
            </div>

            <div className="partners-card-grid partners-card-grid-two">
              {productAngles.map((angle) => (
                <article key={angle.name} className="partners-card">
                  <h3>{angle.name}</h3>
                  <p>{angle.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="partners-cta">
          <div className="partners-shell partners-cta-panel">
            <p>Ready to build Knoledgr into your client work?</p>
            <h2>Start with one live team, one active initiative, and one context problem to fix.</h2>
            <div className="partners-actions">
              <a href="#partner-inquiry" className="partners-btn partners-btn-primary partners-btn-lg">
                Apply as a partner
              </a>
              <Link to={appEntryHref} className="partners-btn partners-btn-ghost partners-btn-lg">
                {user ? "Open app" : "Start free"}
              </Link>
              <a
                href="mailto:legal@knoledgr.com?subject=Knoledgr%20Partner%20Program"
                className="partners-btn partners-btn-line partners-btn-lg"
              >
                Request partner terms
              </a>
            </div>
          </div>

          <div className="partners-shell partners-footer-links">
            <Link to="/">Home</Link>
            <Link to="/docs">Documentation</Link>
            <Link to="/feedback">Feedback</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/security-annex">Security Annex</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
