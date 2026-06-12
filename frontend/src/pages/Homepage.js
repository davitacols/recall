import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLongRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const SECURITY_TAGS = [
  "Role-based access",
  "SSO ready",
  "Workspace isolation",
  "Audit logs",
  "Source-grounded answers",
];

const WORKS_WITH = [
  { label: "Conversations", icon: ChatBubbleLeftRightIcon },
  { label: "Decisions", icon: CheckCircleIcon },
  { label: "Meetings", icon: CalendarIcon },
  { label: "Tasks", icon: ClipboardDocumentListIcon },
  { label: "Documents", icon: DocumentTextIcon },
  { label: "GitHub", icon: CodeBracketIcon },
];

/* ---------- Crafted CSS product mockups ---------- */

function AskMock({ compact }) {
  return (
    <div className={`mk ${compact ? "mk-sm" : ""}`}>
      <div className="mk-prompt">
        <SparklesIcon />
        <span>What did we decide about the rollout window?</span>
      </div>
      <div className="mk-answer">
        <p>
          Two weeks ago the team agreed to ship <strong>Friday mornings only</strong>,
          driven by the on-call rotation change. Owner: Priya.
        </p>
        <div className="mk-sources">
          <span className="mk-src-label">Sources</span>
          <span className="mk-chip">DEC-128</span>
          <span className="mk-chip">Sprint 42 retro</span>
          <span className="mk-chip">Roadmap brief</span>
        </div>
      </div>
    </div>
  );
}

function DecisionMock() {
  return (
    <div className="mk mk-sm">
      <div className="mk-row mk-row-top">
        <span className="mk-tag">DEC-128</span>
        <span className="mk-lozenge mk-lozenge-green">Decided</span>
      </div>
      <p className="mk-title">Ship releases Friday mornings only</p>
      <div className="mk-meta">
        <span className="mk-avatar">P</span>
        <span>Priya Nair</span>
        <span className="mk-dot" />
        <span>Platform</span>
      </div>
      <div className="mk-divider" />
      <div className="mk-line w-90" />
      <div className="mk-line w-70" />
    </div>
  );
}

function GraphMock() {
  return (
    <div className="mk mk-sm mk-graph">
      <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid meet">
        <line x1="160" y1="85" x2="70" y2="42" />
        <line x1="160" y1="85" x2="262" y2="48" />
        <line x1="160" y1="85" x2="60" y2="132" />
        <line x1="160" y1="85" x2="250" y2="132" />
        <circle className="mk-node-hub" cx="160" cy="85" r="9" />
        <circle className="mk-node" cx="70" cy="42" r="6" />
        <circle className="mk-node" cx="262" cy="48" r="6" />
        <circle className="mk-node" cx="60" cy="132" r="6" />
        <circle className="mk-node" cx="250" cy="132" r="6" />
      </svg>
      <div className="mk-graph-labels">
        <span className="mk-chip">Decision</span>
        <span className="mk-chip">Project</span>
        <span className="mk-chip">Owner</span>
        <span className="mk-chip">Doc</span>
      </div>
    </div>
  );
}

function DocsMock() {
  return (
    <div className="mk mk-sm">
      <p className="mk-title">Rollout playbook</p>
      <div className="mk-line w-95" />
      <div className="mk-line w-80" />
      <div className="mk-ref">
        <DocumentTextIcon />
        <span>References <strong>DEC-128</strong></span>
      </div>
      <div className="mk-line w-88" />
      <div className="mk-line w-60" />
    </div>
  );
}

export default function Homepage() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const appEntryHref = user ? "/dashboard" : "/login";
  const revealRef = useRef(null);

  useEffect(() => {
    const savedTheme = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      document.documentElement.setAttribute("data-theme", savedTheme || localStorage.getItem("theme") || "light");
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-reveal: fade + rise each [data-reveal] element as it enters the viewport.
  useEffect(() => {
    const root = revealRef.current;
    if (!root) return undefined;
    const els = Array.from(root.querySelectorAll("[data-reveal]"));
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const tryLink = (route) => (user ? route : "/login");

  return (
    <div className="hp" ref={revealRef}>
      <header className={`hp-header ${isScrolled ? "hp-header-scrolled" : ""}`}>
        <div className="hp-container hp-header-row">
          <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="warm" size="md" />
          </Link>
          <nav className="hp-nav" aria-label="Public navigation">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <Link to="/docs">Docs</Link>
            <Link to="/partners">Partners</Link>
          </nav>
          <div className="hp-header-actions">
            <Link to="/login" className="hp-text-link">Sign in</Link>
            <Link to={appEntryHref} className="hp-button hp-button-primary">
              {user ? "Open app" : "Get started"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hp-hero">
          <div className="hp-container hp-hero-inner">
            <div className="hp-hero-text" data-reveal>
              <Link to="/ask" className="hp-hero-badge">
                <span className="hp-hero-badge-pill">New</span>
                Source-grounded answers
                <ArrowRightIcon aria-hidden="true" />
              </Link>
              <h1>
                Your team already knows the answer.
                <br />
                <span className="hp-hero-accent">Knoledgr remembers where it is.</span>
              </h1>
              <p className="hp-hero-sub">
                Pages, decisions, meetings, and tasks — connected. Ask anything and get an
                answer from your own workspace, with the sources attached.
              </p>
              <div className="hp-actions">
                <Link to={appEntryHref} className="hp-button hp-button-primary hp-button-large">
                  {user ? "Open workspace" : "Start free"}
                  <ArrowLongRightIcon aria-hidden="true" />
                </Link>
                <a href="#product" className="hp-button hp-button-secondary hp-button-large">
                  See how it works
                </a>
              </div>
              <ul className="hp-proof">
                <li><CheckCircleIcon aria-hidden="true" /> No tagging required</li>
                <li><CheckCircleIcon aria-hidden="true" /> Set up in a minute</li>
              </ul>
            </div>

            <div className="hp-hero-mock" data-reveal>
              <AskMock />
            </div>
          </div>

          <div className="hp-container hp-works">
            <p className="hp-works-label">One workspace, every kind of work</p>
            <div className="hp-works-row">
              {WORKS_WITH.map(({ label, icon: Icon }) => (
                <span key={label} className="hp-works-chip"><Icon aria-hidden="true" /> {label}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Product / bento ---------- */}
        <section id="product" className="hp-product">
          <div className="hp-container">
            <div className="hp-product-intro" data-reveal>
              <span className="hp-eyebrow">Product</span>
              <h2>Four surfaces, one workspace.</h2>
              <p>Each one solves a real problem teams hit every week. Skim them and pick where to start.</p>
            </div>

            <div className="hp-bento">
              {/* Flagship — wide */}
              <Link to={tryLink("/ask")} className="hp-bento-card hp-bento-wide" data-reveal>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><SparklesIcon aria-hidden="true" /> Ask Recall</span>
                  <h3>Ask anything. Get the answer with sources stapled to it.</h3>
                  <p className="hp-bento-body">
                    Type a plain-English question. Recall pulls from your pages, decisions, meetings,
                    and tasks, then shows where each part of the answer came from.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Ask Recall" : "Try Ask Recall"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><AskMock compact /></div>
              </Link>

              {/* Decisions */}
              <Link to={tryLink("/decisions")} className="hp-bento-card" data-reveal style={{ "--rd": "90ms" }}>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><CheckCircleIcon aria-hidden="true" /> Decisions</span>
                  <h3>The why doesn't have to live in someone's head.</h3>
                  <p className="hp-bento-body">
                    Log a decision with the tradeoffs, the people in the room, and what got picked.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Decisions" : "Try Decisions"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><DecisionMock /></div>
              </Link>

              {/* Knowledge graph */}
              <Link to={tryLink("/knowledge/graph")} className="hp-bento-card" data-reveal style={{ "--rd": "180ms" }}>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><LinkIcon aria-hidden="true" /> Knowledge Graph</span>
                  <h3>Your workspace, finally connected.</h3>
                  <p className="hp-bento-body">
                    Docs link to decisions, decisions link to projects, projects link to owners.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Graph" : "Try the graph"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><GraphMock /></div>
              </Link>

              {/* Documents — wide reversed */}
              <Link to={tryLink("/business/documents")} className="hp-bento-card hp-bento-wide hp-bento-rev" data-reveal>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><DocumentTextIcon aria-hidden="true" /> Documents</span>
                  <h3>Notes, specs, briefs — searchable the way they should be.</h3>
                  <p className="hp-bento-body">
                    Write in a clean editor. Reference other docs, decisions, and people. When Recall
                    answers a question, your docs are the source.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Documents" : "Try Documents"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><DocsMock /></div>
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="hp-how">
          <div className="hp-container hp-how-grid">
            <div className="hp-how-copy" data-reveal>
              <span className="hp-eyebrow hp-eyebrow-light">How it works</span>
              <h2>Write the way you already write. Recall does the connecting.</h2>
              <p>
                You don't need to tag anything or fill out a form. Recall reads what your team
                writes, links it together, and makes the whole thing askable.
              </p>
            </div>
            <ol className="hp-steps">
              <li data-reveal>
                <span className="hp-step-num">01</span>
                <div>
                  <h4>You work like normal</h4>
                  <p>Docs, meeting notes, tickets, decisions. Whatever you already do.</p>
                </div>
              </li>
              <li data-reveal style={{ "--rd": "110ms" }}>
                <span className="hp-step-num">02</span>
                <div>
                  <h4>Recall builds the graph</h4>
                  <p>Every piece of work gets linked to the people, projects, and decisions it touches.</p>
                </div>
              </li>
              <li data-reveal style={{ "--rd": "220ms" }}>
                <span className="hp-step-num">03</span>
                <div>
                  <h4>Anyone can ask</h4>
                  <p>"What changed last week?" "Why did we pick Postgres?" Answer comes back with receipts.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------- Quote ---------- */}
        <section className="hp-quote">
          <div className="hp-container">
            <blockquote data-reveal>
              <p>"What did we decide about the rollout window?"</p>
              <div className="hp-quote-answer">
                <span className="hp-quote-tag">Recall</span>
                <p>
                  Two weeks ago the team agreed to ship Friday mornings only, pushed by the on-call
                  rotation change. Owner: Priya. Linked to DEC-128 and the Sprint 42 retro.
                </p>
              </div>
            </blockquote>
          </div>
        </section>

        {/* ---------- Trust ---------- */}
        <section className="hp-trust">
          <div className="hp-container hp-trust-inner" data-reveal>
            <p className="hp-trust-lede">Built for teams that take their workspace seriously.</p>
            <ul className="hp-trust-tags">
              {SECURITY_TAGS.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="hp-cta">
          <div className="hp-container hp-cta-inner" data-reveal>
            <h2>Stop re-explaining the same decisions.</h2>
            <p>Free while we're in beta. Set up takes about a minute.</p>
            <div className="hp-actions hp-actions-center">
              <Link to={appEntryHref} className="hp-button hp-button-primary hp-button-xl">
                {user ? "Open Knoledgr" : "Get started"}
                <ArrowUpRightIcon aria-hidden="true" />
              </Link>
              <Link to="/docs" className="hp-button hp-button-secondary hp-button-xl">
                Read the docs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <div className="hp-container hp-footer-row">
          <div className="hp-footer-brand">
            <BrandLogo tone="blue" size="sm" />
            <span>© {new Date().getFullYear()} Knoledgr</span>
          </div>
          <div className="hp-footer-links">
            <Link to="/feedback">Feedback</Link>
            <Link to="/partners">Partners</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/security-annex">Security</Link>
            <Link to="/docs">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
