import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLongRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const heroSignals = [
  {
    title: "Ask Recall",
    detail: "Grounded answers from real workspace history, not disconnected summaries.",
    icon: SparklesIcon,
  },
  {
    title: "Decisions",
    detail: "Capture rationale, owners, and review points while the decision is still live.",
    icon: ClipboardDocumentListIcon,
  },
  {
    title: "Knowledge Graph",
    detail: "Trace how conversations, documents, projects, tasks, and decisions connect.",
    icon: LinkIcon,
  },
  {
    title: "Documents",
    detail: "Keep the source record near the work so teams can recover context quickly.",
    icon: DocumentTextIcon,
  },
];

const featureCards = [
  {
    name: "Ask Recall",
    route: "/ask",
    eyebrow: "Grounded answers",
    description: "Ask one question and recover the decisions, documents, and execution history behind the answer.",
    icon: SparklesIcon,
    image: "/assets/trac10.png",
  },
  {
    name: "Decisions",
    route: "/decisions",
    eyebrow: "Durable records",
    description: "Turn approvals, tradeoffs, and follow-up into a record that stays attached to the work it changed.",
    icon: ClipboardDocumentListIcon,
    image: "/assets/dec4.png",
  },
  {
    name: "Knowledge Graph",
    route: "/knowledge/graph",
    eyebrow: "Connected context",
    description: "See how people, work, meetings, documents, and decisions reinforce each other across the workspace.",
    icon: LinkIcon,
    image: "/assets/trac3.png",
  },
  {
    name: "Documents",
    route: "/business/documents",
    eyebrow: "Source material",
    description: "Keep briefs, plans, and records searchable so the original evidence never drifts away from execution.",
    icon: DocumentTextIcon,
    image: "/assets/trac1.png",
  },
];

const workflowMoments = [
  {
    step: "01",
    title: "Capture the call while it is still fresh",
    text: "Decisions, meetings, and documents stay close to the actual moment the work changed, so teams do not need a second system for context.",
    image: "/assets/dec9.png",
  },
  {
    step: "02",
    title: "Connect the work that moved because of it",
    text: "Projects, tasks, and follow-through inherit the why behind the change instead of losing that reasoning in separate tools.",
    image: "/assets/trac5.png",
  },
  {
    step: "03",
    title: "Recover the record later without replaying everything",
    text: "Ask Recall and the Knowledge Graph help the team recover what changed, why it changed, and what work it affected.",
    image: "/assets/trac11.png",
  },
];

const operatingQuestions = [
  {
    question: "Why did the team change direction?",
    answer: "Recover the decision record, linked notes, and the work it redirected from one place.",
  },
  {
    question: "What documents shaped this call?",
    answer: "Move from Ask Recall into the underlying briefs, docs, and captured meeting history without losing the thread.",
  },
  {
    question: "What work changed because of that decision?",
    answer: "Follow the connected record into projects, tasks, and execution history instead of reconstructing it by hand.",
  },
];

const proofNotes = [
  "Recover the why behind the work",
  "Keep decisions, docs, and execution connected",
  "Give the team one operating record instead of scattered fragments",
];

export default function Homepage() {
  const { user } = useAuth();
  const appEntryHref = user ? "/dashboard" : "/login";

  React.useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () =>
      document.documentElement.setAttribute(
        "data-theme",
        saved || localStorage.getItem("theme") || "light"
      );
  }, []);

  return (
    <div className="hp" data-theme="light">
      <div className="hp-noise" aria-hidden="true" />

      <header className="hp-header">
        <div className="hp-container hp-header-row">
          <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="warm" size="lg" />
          </Link>

          <nav className="hp-nav" aria-label="Public">
            <a href="#product">Product</a>
            <a href="#operating-system">How it works</a>
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

      <main className="hp-main">
        <section className="hp-hero">
          <div className="hp-container hp-hero-grid">
            <div className="hp-hero-copy">
              <p className="hp-kicker">Decision memory for teams</p>

              <div className="hp-pill-row" aria-label="Core product surfaces">
                {heroSignals.map((signal) => (
                  <span key={signal.title} className="hp-pill">
                    {signal.title}
                  </span>
                ))}
              </div>

              <h1 className="hp-title">Give every decision, document, and execution thread a memory.</h1>
              <p className="hp-subtitle">
                Knoledgr keeps the why behind the work easy to recover. Decisions, Ask Recall, the
                Knowledge Graph, and Documents stay connected so teams can move faster without losing
                the record behind what changed.
              </p>

              <div className="hp-actions">
                <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                  {user ? "Open the workspace" : "Start your workspace"}
                </Link>
                <Link to="/docs" className="hp-btn hp-btn-secondary hp-btn-lg">
                  Read documentation
                </Link>
              </div>

              <div className="hp-proof-strip">
                {proofNotes.map((note) => (
                  <div key={note} className="hp-proof-chip">
                    <span className="hp-proof-dot" aria-hidden="true" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hp-stage">
              <article className="hp-stage-panel">
                <div className="hp-stage-toolbar" aria-hidden="true">
                  <div className="hp-shell-dots">
                    <span className="hp-shell-dot" />
                    <span className="hp-shell-dot" />
                    <span className="hp-shell-dot" />
                  </div>
                  <span className="hp-stage-label">Knoledgr workspace walkthrough</span>
                </div>

                <div className="hp-stage-media">
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
                  <span className="hp-stage-cover-chip" aria-hidden="true">
                    Knoledgr workspace
                  </span>
                  <span className="hp-stage-badge">Product walkthrough</span>
                </div>

                <div className="hp-stage-footer">
                  <div className="hp-stage-copy">
                    <p className="hp-kicker">One operating record</p>
                    <h2>Capture the call, connect the work, recover the context.</h2>
                    <p>
                      The workspace keeps rationale, source documents, and execution changes attached
                      to each other instead of scattering them across disconnected tools.
                    </p>
                  </div>

                  <div className="hp-stage-signal-grid">
                    {heroSignals.slice(0, 3).map((signal) => (
                      <article key={signal.title} className="hp-stage-signal">
                        <span className="hp-stage-signal-icon" aria-hidden="true">
                          <signal.icon />
                        </span>
                        <strong>{signal.title}</strong>
                        <span>{signal.detail}</span>
                      </article>
                    ))}
                  </div>
                </div>
              </article>

              <article className="hp-floating-card hp-floating-card-top">
                <p className="hp-card-kicker">What teams recover</p>
                <ul className="hp-question-list">
                  {operatingQuestions.slice(0, 2).map((item) => (
                    <li key={item.question}>{item.question}</li>
                  ))}
                </ul>
              </article>

              <article className="hp-floating-card hp-floating-card-bottom">
                <p className="hp-card-kicker">Proof surface</p>
                <img src="/assets/trac3.png" alt="" className="hp-floating-image" />
                <p className="hp-floating-copy">
                  Knowledge Graph keeps related work, conversations, documents, and decisions visible
                  in the same trail.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="product" className="hp-section hp-section-product">
          <div className="hp-container">
            <div className="hp-section-head">
              <p className="hp-kicker">Product</p>
              <h2>Built around the surfaces teams actually use to keep context alive.</h2>
              <p>
                Every public claim here maps to a shipped Knoledgr surface. The homepage explains how
                those surfaces work together instead of inventing new labels the product does not use.
              </p>
            </div>

            <div className="hp-feature-grid">
              {featureCards.map((feature) => (
                <article key={feature.name} className="hp-feature-card">
                  <div className="hp-feature-head">
                    <span className="hp-feature-icon" aria-hidden="true">
                      <feature.icon />
                    </span>
                    <div className="hp-feature-copy">
                      <p className="hp-feature-eyebrow">{feature.eyebrow}</p>
                      <h3>{feature.name}</h3>
                    </div>
                  </div>

                  <p className="hp-feature-text">{feature.description}</p>

                  <div className="hp-feature-preview">
                    <img src={feature.image} alt="" />
                  </div>

                  <Link to={user ? feature.route : "/login"} className="hp-feature-link">
                    <span>{user ? `Open ${feature.name}` : `Sign in to explore ${feature.name}`}</span>
                    <ArrowLongRightIcon />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="operating-system" className="hp-section hp-section-flow">
          <div className="hp-container hp-flow-grid">
            <div className="hp-flow-copy">
              <p className="hp-kicker">How it works</p>
              <h2>From conversation to execution without losing the why.</h2>
              <p>
                Knoledgr is strongest when the team can capture the decision, connect the work it
                changed, and recover that record later without extra ceremony.
              </p>
            </div>

            <div className="hp-flow-stack">
              {workflowMoments.map((moment) => (
                <article key={moment.step} className="hp-flow-card">
                  <div className="hp-flow-index">{moment.step}</div>
                  <div className="hp-flow-body">
                    <div className="hp-flow-image-wrap">
                      <img src={moment.image} alt="" className="hp-flow-image" />
                    </div>
                    <div className="hp-flow-copy-block">
                      <h3>{moment.title}</h3>
                      <p>{moment.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="hp-question-panel">
              <p className="hp-kicker">Operating questions</p>
              <h3>Questions teams can answer without reconstructing the past by hand.</h3>
              <div className="hp-question-stack">
                {operatingQuestions.map((item) => (
                  <article key={item.question} className="hp-question-card">
                    <strong>{item.question}</strong>
                    <span>{item.answer}</span>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-container hp-cta-panel">
            <div className="hp-cta-copy">
              <p className="hp-kicker">Start with a workspace that remembers</p>
              <h2>Make context easier to keep than to lose.</h2>
              <p>
                Knoledgr gives the team one connected record for decisions, documents, execution, and
                grounded answers.
              </p>
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
