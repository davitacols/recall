import React from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const principles = [
  {
    index: "01",
    title: "Capture the moment work happens",
    text: "Keep decisions, meeting notes, and conversations close to the action instead of scattering them across tools.",
  },
  {
    index: "02",
    title: "Connect the why to the work",
    text: "Link rationale, owners, documents, and downstream follow-through so context survives handoffs and time.",
  },
  {
    index: "03",
    title: "Recover context in seconds",
    text: "Ask Recall and the Knowledge Graph help teams find the reasoning behind what changed without replaying old debates.",
  },
];

const modules = [
  {
    name: "Decisions",
    detail: "Capture key decisions with rationale, owners, approvals, and impact.",
    tag: "Core",
    href: "/login",
  },
  {
    name: "Knowledge Graph",
    detail: "See how conversations, documents, projects, and historical signals connect across the workspace.",
    tag: "Intelligence",
    href: "/login",
  },
  {
    name: "Ask Recall",
    detail: "Get grounded answers from your team's actual history, not generic AI output.",
    tag: "Assistant",
    href: "/login",
  },
  {
    name: "Documents",
    detail: "Keep the source record close to active work so teams can trace the record behind every decision.",
    tag: "Memory",
    href: "/login",
  },
];

const highlights = [
  { value: "< 60s", label: "to recover decision context" },
  { value: "1 place", label: "for the why behind execution" },
  { value: "24/7", label: "grounded answers from team history" },
];

const previewNotes = [
  { label: "Morning brief", text: "A pricing decision now points to the original discussion, approval, and rollout risk." },
  { label: "Linked memory", text: "Meeting notes, documents, and follow-up tasks stay attached instead of becoming loose references." },
  { label: "Ask Recall", text: "A teammate can ask what changed, why it changed, and what still needs attention." },
];

const signalCards = [
  {
    title: "Less re-explaining",
    text: "New teammates and busy stakeholders can pick up the thread without waiting for someone to retell the story.",
  },
  {
    title: "Calmer execution",
    text: "Projects, decisions, and business work stay connected, so follow-through feels grounded instead of reactive.",
  },
  {
    title: "A better record",
    text: "The Knowledge Graph and Documents surface give teams a durable memory instead of a fragile chain of tabs and chats.",
  },
];

export default function Homepage() {
  const { user } = useAuth();
  const appEntryHref = user ? "/dashboard" : "/login";

  return (
    <div className="hp">
      <div className="hp-texture" />
      <div className="hp-glow hp-glow-a" />
      <div className="hp-glow hp-glow-b" />

      <header className="hp-header">
        <div className="hp-container hp-header-row">
            <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
              <BrandLogo tone="warm" size="lg" />
            </Link>

          <div className="hp-header-actions">
            <Link to="/docs" className="hp-btn hp-btn-ghost">
              Documentation
            </Link>
            <a href="#preview" className="hp-btn hp-btn-ghost">
              Preview the workspace
            </a>
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
              <p className="hp-eyebrow">Decision memory for teams</p>
              <h1 className="hp-title">
                Knoledgr keeps your team's context
                <span className="hp-word-slot">
                  <span className="hp-word">searchable.</span>
                </span>
              </h1>
              <p className="hp-subtitle">
                Decisions, documents, conversations, and follow-through should feel like one narrative,
                not four disconnected places to search when someone asks what happened and why.
              </p>

              <div className="hp-actions">
                <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                  {user ? "Open the app" : "Start your workspace"}
                </Link>
                <a href="#modules" className="hp-btn hp-btn-ghost hp-btn-lg">
                  See the product surface
                </a>
              </div>

              <div className="hp-highlights">
                {highlights.map((item) => (
                  <article key={item.label} className="hp-highlight-card">
                    <p className="hp-highlight-value">{item.value}</p>
                    <p className="hp-highlight-label">{item.label}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside id="preview" className="hp-preview">
              <div className="hp-preview-head">
                <div>
                  <p className="hp-preview-kicker">Workspace preview</p>
                  <h2>One place to recover the thread</h2>
                </div>
                <span className="hp-preview-pill">Live context</span>
              </div>

              <div className="hp-preview-card">
                <div className="hp-preview-visual" aria-hidden="true">
                  <img
                    src="/brand/knoledgr-app-screenshot.svg"
                    alt=""
                    className="hp-preview-shot"
                  />
                  <img
                    src="/brand/knoledgr-memory-orbit.svg"
                    alt=""
                    className="hp-preview-orbit"
                  />
                </div>

                <div className="hp-preview-panel">
                  <p className="hp-preview-label">Decision timeline</p>
                  <h3>Pricing review approved</h3>
                  <p>
                    Rationale, linked discussion, and rollout risk are attached to the same record instead of buried in separate tools.
                  </p>
                </div>

                <div className="hp-preview-stack">
                  {previewNotes.map((note) => (
                    <article key={note.label} className="hp-preview-note">
                      <span>{note.label}</span>
                      <p>{note.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head">
              <p>How it works</p>
              <h2>A calmer system for context-heavy work</h2>
            </div>

            <div className="hp-principles">
              {principles.map((item) => (
                <article key={item.title} className="hp-principle-card">
                  <span>{item.index}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section hp-section-tight" id="modules">
          <div className="hp-container hp-editorial-grid">
            <div className="hp-editorial-copy">
              <p>Shipped product surface</p>
              <h2>Built around the routes teams actually use</h2>
              <p>
                Knoledgr centers the real product surface: Decisions, Knowledge Graph, Ask Recall, and Documents.
                The landing page now points people into the same story the app tells after sign-in.
              </p>
            </div>

            <div className="hp-module-grid">
              {modules.map((module) => (
                <Link key={module.name} to={module.href} className="hp-module-card">
                  <span>{module.tag}</span>
                  <h3>{module.name}</h3>
                  <p>{module.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head">
              <p>Why teams stay</p>
              <h2>Because context should travel with the work</h2>
            </div>

            <div className="hp-signal-grid">
              {signalCards.map((card) => (
                <article key={card.title} className="hp-signal-card">
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-container hp-cta-panel">
            <p>Ready to stop re-deciding what your team already learned?</p>
            <h2>Start a workspace that remembers.</h2>
            <div className="hp-actions">
              <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                {user ? "Open the app" : "Get started free"}
              </Link>
              <a href="#preview" className="hp-btn hp-btn-line hp-btn-lg">
                Preview the experience
              </a>
            </div>
          </div>
          <div className="hp-container hp-legal">
            <Link to="/docs">Documentation</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/security-annex">Security Annex</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
