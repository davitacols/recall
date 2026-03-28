import React from "react";
import { Link } from "react-router-dom";
import { LinkIcon, MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const heroSignals = [
  {
    value: "Grounded answers",
    label: "Ask Recall responds from real workspace history instead of disconnected summaries.",
    icon: SparklesIcon,
    className: "hp-signal-row-answer",
  },
  {
    value: "Connected records",
    label: "Keep decisions, documents, conversations, and execution attached to the same operating record.",
    icon: LinkIcon,
    className: "hp-signal-row-records",
  },
  {
    value: "Recoverable context",
    label: "Find the reasoning behind work changes without replaying every meeting or thread.",
    icon: MagnifyingGlassIcon,
    className: "hp-signal-row-context",
  },
];

const heroModules = [
  { name: "Ask Recall", detail: "Grounded answers" },
  { name: "Decisions", detail: "Durable records" },
  { name: "Knowledge Graph", detail: "Linked context" },
];

const heroMediaNotes = [
  {
    title: "Decision trail",
    detail: "Rationale, owners, and review points stay attached to the work itself.",
  },
  {
    title: "Execution context",
    detail: "Projects, issues, and sprint changes inherit the why behind what moved.",
  },
  {
    title: "Searchable memory",
    detail: "Teams can recover the record without replaying every thread or meeting.",
  },
];

const workflowPoints = [
  {
    title: "Capture decisions in context",
    text: "Capture the rationale, notes, owners, and review points while the decision is still close to the actual work.",
    image: "/assets/trac1.png",
  },
  {
    title: "Connect work to the why",
    text: "Projects, issues, documents, and follow-up tasks stay connected to the reasoning behind what changed.",
    image: "/assets/trac5.png",
  },
  {
    title: "Recover the record instantly",
    text: "Ask Recall and the Knowledge Graph help the team recover grounded answers from real organizational history.",
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
              <div className="hp-hero-modules" aria-label="Core product surfaces">
                {heroModules.map((module) => (
                  <div key={module.name} className="hp-hero-module">
                    <strong>{module.name}</strong>
                    <span>{module.detail}</span>
                  </div>
                ))}
              </div>
              <h1 className="hp-title">Keep the why behind the work easy to recover.</h1>
              <p className="hp-subtitle">
                Knoledgr keeps decisions, conversations, documents, and execution connected in one workspace, so teams can recover the
                reasoning behind work without digging through scattered tools.
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
                  <article key={signal.value} className={`hp-signal-row ${signal.className}`}>
                    <span className="hp-signal-icon" aria-hidden="true">
                      <signal.icon />
                    </span>
                    <strong>{signal.value}</strong>
                    <span>{signal.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="hp-hero-media">
              <div className="hp-media-scene">
                <article className="hp-media-card">
                  <div className="hp-media-shell-bar" aria-hidden="true">
                    <div className="hp-shell-dots">
                      <span className="hp-shell-dot" />
                      <span className="hp-shell-dot" />
                      <span className="hp-shell-dot" />
                    </div>
                    <span className="hp-shell-label">Live workspace view</span>
                  </div>
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
                      Knoledgr keeps the record behind the work intact, so decisions and follow-through remain easy to revisit when plans shift.
                    </p>
                    <div className="hp-media-note-grid">
                      {heroMediaNotes.map((note) => (
                        <article key={note.title} className="hp-media-note">
                          <strong>{note.title}</strong>
                          <span>{note.detail}</span>
                        </article>
                      ))}
                    </div>
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
                Decisions, Ask Recall, and the Knowledge Graph work together so answers stay grounded in workspace history and execution
                remains traceable as work moves.
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
