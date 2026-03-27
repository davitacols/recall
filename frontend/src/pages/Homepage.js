import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const heroSignals = [
  { value: "< 60s", label: "Recover the reasoning behind a change without replaying the whole thread." },
  { value: "1 record", label: "Keep decisions, docs, conversations, and execution attached to the same source of truth." },
  { value: "24/7", label: "Ask Recall answers from your workspace history instead of from generic summaries." },
];

const workflowPoints = [
  {
    title: "Capture decisions in context",
    text: "Notes, discussion, rationale, owners, and review points stay close to the actual work.",
    image: "/assets/trac1.png",
  },
  {
    title: "Connect work to the why",
    text: "Projects, issues, documents, and follow-up tasks inherit the reasoning behind what changed.",
    image: "/assets/trac5.png",
  },
  {
    title: "Recover the record instantly",
    text: "Ask Recall and the Knowledge Graph help the team find credible answers from real organizational history.",
    image: "/assets/trac10.png",
  },
];

const productNotes = [
  {
    name: "Decisions",
    detail: "Capture rationale, approvals, and outcome reviews in one durable record.",
  },
  {
    name: "Ask Recall",
    detail: "Get grounded answers with the underlying history still attached to the response.",
  },
  {
    name: "Knowledge Graph",
    detail: "See how conversations, projects, documents, tasks, and decisions connect across the workspace.",
  },
];

const heroOrbitFrames = [
  { name: "Decisions", image: "/assets/trac3.png", className: "hp-orbit-card-a" },
  { name: "Projects", image: "/assets/trac5.png", className: "hp-orbit-card-b" },
];

export default function Homepage() {
  const { user } = useAuth();
  const appEntryHref = user ? "/dashboard" : "/login";

  React.useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
  }, []);

  return (
    <div className="hp" data-theme="light">
      <header className="hp-header">
        <div className="hp-container hp-header-row">
          <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="warm" size="lg" />
          </Link>

          <nav className="hp-nav" aria-label="Public">
            <a href="#how-it-works">How it works</a>
            <a href="#product">Product</a>
            <Link to="/docs">Docs</Link>
          </nav>

          <div className="hp-header-actions">
            <Link to="/login" className="hp-link">
              Sign in
            </Link>
            <Link to={appEntryHref} className="hp-btn hp-btn-primary">
              {user ? "Open app" : "Start free"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hp-hero">
          <div className="hp-container hp-hero-grid">
            <div className="hp-hero-copy">
              <p className="hp-kicker">Decision memory for teams</p>
              <h1 className="hp-title">Keep the why behind the work easy to recover.</h1>
              <p className="hp-subtitle">
                Knoledgr brings decisions, documents, conversations, and execution into one calm operating record so the team can move
                faster without losing context every time work changes hands.
              </p>

              <div className="hp-actions">
                <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                  {user ? "Open the workspace" : "Start your workspace"}
                </Link>
                <Link to="/docs" className="hp-btn hp-btn-secondary hp-btn-lg">
                  Read documentation
                </Link>
              </div>

              <div className="hp-signal-list">
                {heroSignals.map((signal) => (
                  <article key={signal.value} className="hp-signal-row">
                    <strong>{signal.value}</strong>
                    <span>{signal.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="hp-hero-media">
              <div className="hp-media-scene">
                <article className="hp-media-card">
                  <div className="hp-video-frame">
                    <video
                      className="hp-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster="/assets/trac1.png"
                    >
                      <source src="/assets/Decision_Memory_for_Teams.mp4" type="video/mp4" />
                    </video>
                    <span className="hp-media-badge">Product walkthrough</span>
                    <span className="hp-media-corner-brand">Knoledgr</span>
                  </div>
                  <div className="hp-media-copy">
                    <p className="hp-kicker">One operating record</p>
                    <h2>Capture the decision, connect the work, recover the context.</h2>
                    <p>
                      The public experience now shows the product more directly, with the real workflow in front instead of stacked marketing
                      ornament.
                    </p>
                  </div>
                </article>

                <div className="hp-orbit-grid" aria-hidden="true">
                  {heroOrbitFrames.map((frame) => (
                    <div key={frame.name} className={`hp-orbit-card ${frame.className}`}>
                      <img src={frame.image} alt="" />
                      <span>{frame.name}</span>
                    </div>
                  ))}
                  <div className="hp-orbit-core" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head">
              <p className="hp-kicker">How it works</p>
              <h2>Three moves, one memory system.</h2>
              <p>Knoledgr is strongest when the team can capture, connect, and recover context without extra ceremony.</p>
            </div>

            <div className="hp-workflow-grid">
              {workflowPoints.map((point, index) => (
                <article key={point.title} className="hp-workflow-card">
                  <span className="hp-workflow-index">0{index + 1}</span>
                  <img src={point.image} alt="" className="hp-workflow-image" />
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="hp-section hp-section-product">
          <div className="hp-container hp-product-grid">
            <div className="hp-product-copy">
              <p className="hp-kicker">Product</p>
              <h2>Built around the surfaces teams actually use.</h2>
              <p>
                Decisions, Ask Recall, and the Knowledge Graph work together so answers remain grounded, execution stays traceable, and old
                context does not disappear the moment the sprint changes.
              </p>
              <Link to="/login" className="hp-btn hp-btn-secondary">
                Explore the product
              </Link>
            </div>

            <div className="hp-product-notes">
              {productNotes.map((note) => (
                <article key={note.name} className="hp-product-card">
                  <h3>{note.name}</h3>
                  <p>{note.detail}</p>
                </article>
              ))}
              <div className="hp-product-image-card">
                <img src="/assets/trac10.png" alt="" className="hp-product-image" />
              </div>
            </div>
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-container hp-cta-row">
            <div className="hp-cta-copy">
              <p className="hp-kicker">Start with a workspace that remembers</p>
              <h2>Make context easier to keep than to lose.</h2>
            </div>

            <div className="hp-cta-actions">
              <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                {user ? "Open the app" : "Get started free"}
              </Link>
              <Link to="/partners" className="hp-btn hp-btn-secondary hp-btn-lg">
                Partner with Knoledgr
              </Link>
            </div>
          </div>

          <div className="hp-container hp-footer-links">
            <Link to="/feedback">Feedback</Link>
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
