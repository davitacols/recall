import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLongRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  LinkIcon,
  SparklesIcon,
  BoltIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

/* ─── Data ───────────────────────────────────────────────────────────────── */
const STATS = [
  { value: 10, suffix: "k+", label: "AI-grounded records" },
  { value: 98, suffix: "%", label: "Context recovery rate" },
  { value: 3, suffix: "x", label: "Faster AI-assisted onboarding" },
  { value: 500, suffix: "+", label: "Teams using Knoledgr AI" },
];

const FEATURES = [
  {
    name: "Ask Recall",
    route: "/ask",
    eyebrow: "AI assistant",
    description: "Ask, draft, summarize, and reason over your team's decisions, documents, and execution history.",
    icon: SparklesIcon,
    image: "/assets/trac10.png",
    color: "#60a5fa",
    colorBg: "rgba(96,165,250,0.1)",
  },
  {
    name: "Decisions",
    route: "/decisions",
    eyebrow: "AI-ready memory",
    description: "Turn approvals and tradeoffs into structured context the assistant can cite and reuse.",
    icon: ClipboardDocumentListIcon,
    image: "/assets/dec4.png",
    color: "#2563eb",
    colorBg: "rgba(37,99,235,0.1)",
  },
  {
    name: "Knowledge Graph",
    route: "/knowledge/graph",
    eyebrow: "Context engine",
    description: "Connect people, work, meetings, documents, and decisions so AI answers know what they are grounded in.",
    icon: LinkIcon,
    image: "/assets/trac3.png",
    color: "#a78bfa",
    colorBg: "rgba(167,139,250,0.08)",
  },
  {
    name: "Documents",
    route: "/business/documents",
    eyebrow: "AI source material",
    description: "Keep briefs, plans, and records searchable so every generated answer can stay close to evidence.",
    icon: DocumentTextIcon,
    image: "/assets/trac1.png",
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.08)",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Capture work as AI-readable context",
    text: "Decisions, meetings, and documents become structured source material instead of scattered notes.",
    image: "/assets/dec9.png",
    icon: BoltIcon,
  },
  {
    step: "02",
    title: "Let the graph connect the work",
    text: "Projects, tasks, and follow-through inherit the why behind each change so AI can reason across surfaces.",
    image: "/assets/trac5.png",
    icon: LinkIcon,
  },
  {
    step: "03",
    title: "Ask the workspace what matters next",
    text: "Ask Recall surfaces what changed, why it happened, what it affects, and what to do next.",
    image: "/assets/trac11.png",
    icon: SparklesIcon,
  },
];

const TRUST_ITEMS = [
  { icon: ShieldCheckIcon, label: "SOC 2 ready" },
  { icon: UsersIcon, label: "Role-based access" },
  { icon: BoltIcon, label: "Real-time sync" },
  { icon: SparklesIcon, label: "AI workspace" },
];

/* ─── Hooks ──────────────────────────────────────────────────────────────── */
function useTypewriter(words, speed = 80, pause = 2200) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    const delay = deleting ? speed / 2 : charIdx === current.length ? pause : speed;

    const t = setTimeout(() => {
      if (!deleting && charIdx < current.length) {
        setDisplay(current.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      } else if (!deleting && charIdx === current.length) {
        setDeleting(true);
      } else if (deleting && charIdx > 0) {
        setDisplay(current.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      } else {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      }
    }, delay);

    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({ value, suffix, label }) {
  const [ref, inView] = useInView(0.3);
  const count = useCountUp(value, 1600, inView);
  return (
    <div ref={ref} className="hp-stat">
      <span className="hp-stat-value">{count}{suffix}</span>
      <span className="hp-stat-label">{label}</span>
    </div>
  );
}



function FeatureCard({ feature, index, user }) {
  const [ref, inView] = useInView(0.1);
  return (
    <article
      ref={ref}
      className={`hp-feature-card ${inView ? "hp-reveal" : ""}`}
      style={{ "--delay": `${index * 80}ms`, "--accent": feature.color, "--accent-bg": feature.colorBg }}
    >
      <div className="hp-feature-head">
        <span className="hp-feature-icon">
          <feature.icon />
        </span>
        <div>
          <p className="hp-feature-eyebrow">{feature.eyebrow}</p>
          <h3>{feature.name}</h3>
        </div>
      </div>
      <p className="hp-feature-text">{feature.description}</p>
      <div className="hp-feature-preview">
        <img src={feature.image} alt="" loading="lazy" />
        <div className="hp-feature-preview-overlay" />
      </div>
      <Link to={user ? feature.route : "/login"} className="hp-feature-link">
        <span>{user ? `Open ${feature.name}` : "Sign in to explore"}</span>
        <ArrowLongRightIcon />
      </Link>
    </article>
  );
}

function FlowCard({ moment, index }) {
  const [ref, inView] = useInView(0.15);
  return (
    <article
      ref={ref}
      className={`hp-flow-card ${inView ? "hp-reveal" : ""}`}
      style={{ "--delay": `${index * 120}ms` }}
    >
      <div className="hp-flow-step">
        <span className="hp-flow-step-num">{moment.step}</span>
        <div className="hp-flow-step-line" />
      </div>
      <div className="hp-flow-body">
        <div className="hp-flow-image-wrap">
          <img src={moment.image} alt="" className="hp-flow-image" loading="lazy" />
        </div>
        <div className="hp-flow-copy">
          <h3>{moment.title}</h3>
          <p>{moment.text}</p>
        </div>
      </div>
    </article>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Homepage() {
  const { user } = useAuth();
  const appEntryHref = user ? "/dashboard" : "/login";
  const typed = useTypewriter(["an AI teammate.", "a context engine.", "a working memory.", "a second brain."]);
  const [scrollY, setScrollY] = useState(0);
  const [statsRef, statsInView] = useInView(0.2);
  const heroRef = useRef(null);

  useEffect(() => {
    const saved = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", "dark");
    return () =>
      document.documentElement.setAttribute("data-theme", saved || localStorage.getItem("theme") || "light");
  }, []);

  const handleScroll = useCallback(() => setScrollY(window.scrollY), []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const parallaxY = scrollY * 0.18;

  return (
    <div className="hp" data-theme="dark">
      {/* Animated mesh background */}
      <div className="hp-mesh" aria-hidden="true">
        <div className="hp-mesh-orb hp-mesh-orb-1" />
        <div className="hp-mesh-orb hp-mesh-orb-2" />
        <div className="hp-mesh-orb hp-mesh-orb-3" />
        <div className="hp-mesh-grid" />
      </div>

      {/* Header */}
      <header className={`hp-header ${scrollY > 40 ? "hp-header-scrolled" : ""}`}>
        <div className="hp-container hp-header-row">
          <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
            <BrandLogo tone="blueLight" size="lg" />
          </Link>
          <nav className="hp-nav" aria-label="Public">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <Link to="/docs">Docs</Link>
          </nav>
          <div className="hp-header-actions">
            <Link to="/login" className="hp-link">Sign in</Link>
            <Link to={appEntryHref} className="hp-btn hp-btn-primary">
              {user ? "Open app" : "Get started with AI"}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="hp-hero" ref={heroRef}>
          <div className="hp-container">
            <div className="hp-hero-inner">

              <div className="hp-hero-badge">
                <span className="hp-hero-badge-dot" />
                AI workspace for teams
              </div>

              <h1 className="hp-title">
                Turn team knowledge into
                <br />
                <span className="hp-title-typed">
                  {typed}
                  <span className="hp-cursor" aria-hidden="true" />
                </span>
              </h1>

              <p className="hp-subtitle">
                Knoledgr is an AI platform for teams that need answers grounded in real work.
                Ask Recall, Decisions, the Knowledge Graph, and Documents turn scattered context
                into an assistant that can explain, summarize, draft, and guide the next move.
              </p>

              <div className="hp-actions">
                <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                  {user ? "Open AI workspace" : "Start with Knoledgr AI"}
                  <ArrowLongRightIcon className="hp-btn-icon" />
                </Link>
                <Link to="/docs" className="hp-btn hp-btn-ghost hp-btn-lg">
                  Read the docs
                </Link>
              </div>

              <div className="hp-trust-row">
                {TRUST_ITEMS.map((t) => (
                  <div key={t.label} className="hp-trust-chip">
                    <t.icon />
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>

              {/* Hero stage with parallax */}
              <div
                className="hp-stage"
                style={{ transform: `translateY(${parallaxY}px)` }}
              >
                <div className="hp-stage-glow" aria-hidden="true" />
                <article className="hp-stage-panel">
                  <div className="hp-stage-toolbar" aria-hidden="true">
                    <div className="hp-shell-dots">
                      <span className="hp-shell-dot hp-dot-red" />
                      <span className="hp-shell-dot hp-dot-yellow" />
                      <span className="hp-shell-dot hp-dot-green" />
                    </div>
                    <span className="hp-stage-label">knoledgr.com — workspace</span>
                    <div className="hp-stage-toolbar-right">
                      <span className="hp-stage-live-dot" />
                      <span className="hp-stage-live-text">Live</span>
                    </div>
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
                    <div className="hp-stage-scan" aria-hidden="true" />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="hp-stats-section">
          <div className="hp-container">
            <div className="hp-stats-grid" ref={statsRef}>
              {STATS.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Product ── */}
        <section id="product" className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head">
              <p className="hp-kicker">Product</p>
              <h2>An AI workspace built on the context your team already creates.</h2>
              <p>Every AI answer is grounded in shipped Knoledgr surfaces: Ask Recall, Decisions, Knowledge Graph, and Documents.</p>
            </div>
            <div className="hp-feature-grid">
              {FEATURES.map((f, i) => (
                <FeatureCard key={f.name} feature={f} index={i} user={user} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="hp-section hp-section-flow">
          <div className="hp-container hp-flow-layout">
            <div className="hp-flow-header">
              <p className="hp-kicker">How it works</p>
              <h2>From raw work to AI-assisted execution.</h2>
              <p>
                Knoledgr is strongest when your team's decisions, docs, meetings, and tasks become
                connected context that an AI assistant can actually use.
              </p>
              <Link to={appEntryHref} className="hp-btn hp-btn-primary" style={{ marginTop: 8, width: "fit-content" }}>
                {user ? "Open AI workspace" : "Try Knoledgr AI"}
                <ArrowLongRightIcon className="hp-btn-icon" />
              </Link>
            </div>
            <div className="hp-flow-stack">
              {HOW_IT_WORKS.map((m, i) => (
                <FlowCard key={m.step} moment={m} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="hp-cta">
          <div className="hp-container">
            <div className="hp-cta-panel">
              <div className="hp-cta-glow" aria-hidden="true" />
              <div className="hp-cta-inner">
                <p className="hp-kicker">Start with an AI workspace that remembers</p>
                <h2>Give your team an assistant that knows the work.</h2>
                <p>One connected AI platform for grounded answers, decisions, documents, and execution context.</p>
                <div className="hp-cta-actions">
                  <Link to={appEntryHref} className="hp-btn hp-btn-primary hp-btn-lg">
                    {user ? "Open the app" : "Get started with AI"}
                    <ArrowLongRightIcon className="hp-btn-icon" />
                  </Link>
                  <Link to="/partners" className="hp-btn hp-btn-ghost hp-btn-lg">
                    Partner with us
                  </Link>
                </div>
              </div>
            </div>

            <footer className="hp-footer">
              <div className="hp-footer-brand">
                <BrandLogo tone="blueLight" size="sm" />
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
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
