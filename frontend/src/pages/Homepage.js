import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
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
import KnowledgeGraphCanvas from "../components/KnowledgeGraphCanvas";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

const SECURITY_TAGS = [
  "Role-based access",
  "SSO ready",
  "Workspace isolation",
  "Audit logs",
  "Source-grounded answers",
];

/* Framed as the places reasoning already gets buried, not as product surfaces
   we replace. Under the decision-memory positioning these are inputs, so the
   page never invites a feature-by-feature comparison with Jira. */
const SOURCES = [
  { label: "Pull requests", icon: CodeBracketIcon },
  { label: "Threads", icon: ChatBubbleLeftRightIcon },
  { label: "Meeting notes", icon: CalendarIcon },
  { label: "Design docs", icon: DocumentTextIcon },
  { label: "Tickets", icon: ClipboardDocumentListIcon },
];

/* ---------- Motion ----------
 * One shared vocabulary so the page moves as a system rather than a pile of
 * effects: things enter from 12px below, on the same easing, staggered by
 * their reading order. Every variant respects prefers-reduced-motion via the
 * `reduce` flag threaded down from the component.
 */
const EASE = [0.2, 0, 0, 1];

const riseParent = (reduce, stagger = 0.07) => ({
  hidden: {},
  show: { transition: { staggerChildren: reduce ? 0 : stagger } },
});

const rise = (reduce) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 12 },
  show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.5, ease: EASE } },
});

/* ---------- Crafted CSS product mockups ---------- */

/* The hero mock animates in the product's actual sequence — question, then
   answer, then the sources that back it. The motion is the argument: the
   citations arrive last because that is the part that matters. */
function AskMock({ compact, animate }) {
  const reduce = useReducedMotion();
  if (!animate) {
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

  const chips = ["DEC-128", "Sprint 42 retro", "Roadmap brief"];

  return (
    <motion.div
      className={`mk ${compact ? "mk-sm" : ""}`}
      initial="hidden"
      animate="show"
      variants={riseParent(reduce, 0.5)}
    >
      <motion.div className="mk-prompt" variants={rise(reduce)}>
        <SparklesIcon />
        <span>What did we decide about the rollout window?</span>
      </motion.div>
      <motion.div className="mk-answer" variants={rise(reduce)}>
        <p>
          Two weeks ago the team agreed to ship <strong>Friday mornings only</strong>,
          driven by the on-call rotation change. Owner: Priya.
        </p>
        <motion.div
          className="mk-sources"
          variants={riseParent(reduce, 0.1)}
          initial="hidden"
          animate="show"
        >
          <motion.span className="mk-src-label" variants={rise(reduce)}>Sources</motion.span>
          {chips.map((c) => (
            <motion.span key={c} className="mk-chip" variants={rise(reduce)}>{c}</motion.span>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
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


function GitHubMock() {
  return (
    <div className="mk mk-sm">
      <div className="mk-row mk-row-top">
        <span className="mk-tag">DEC-128</span>
        <span className="mk-lozenge mk-lozenge-green">Decided</span>
      </div>
      <p className="mk-title">Ship releases Friday mornings only</p>
      <div className="mk-divider" />
      <div className="mk-pr">
        <CodeBracketIcon />
        <span className="mk-pr-id">#412</span>
        <span className="mk-pr-title">Move deploy window to Friday AM</span>
        <span className="mk-lozenge mk-lozenge-merged">Merged</span>
      </div>
      <div className="mk-pr">
        <CodeBracketIcon />
        <span className="mk-pr-id">#418</span>
        <span className="mk-pr-title">Update on-call rotation docs</span>
        <span className="mk-lozenge mk-lozenge-merged">Merged</span>
      </div>
    </div>
  );
}


export default function Homepage() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const appEntryHref = user ? "/dashboard" : "/login";
  const revealRef = useRef(null);
  const reduceMotion = useReducedMotion();

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

  // Scroll choreography. GSAP + ScrollTrigger replaces the hand-rolled
  // IntersectionObserver: same [data-reveal] contract, but siblings that enter
  // together are batched and staggered, so a row of cards arrives as a wave
  // rather than four independent pops.
  useEffect(() => {
    const root = revealRef.current;
    if (!root) return undefined;
    const els = Array.from(root.querySelectorAll("[data-reveal]"));
    if (!els.length) return undefined;

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return undefined;
    }

    let ctx;
    let cancelled = false;

    // Code-split: GSAP only loads for visitors who reach this page, and never
    // blocks first paint.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          ScrollTrigger.batch(els, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                opacity: 1,
                y: 0,
                duration: 0.62,
                ease: "power3.out",
                stagger: 0.09,
                overwrite: true,
                onComplete: () =>
                  batch.forEach((el) => el.classList.add("is-revealed")),
              });
            },
          });
        }, root);
      }
    );

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
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
            <motion.div
              className="hp-hero-text"
              initial="hidden"
              animate="show"
              variants={riseParent(reduceMotion, 0.09)}
            >
              <motion.div variants={rise(reduceMotion)}>
                <Link to="/ask" className="hp-hero-badge">
                  <span className="hp-hero-badge-pill">New</span>
                  Source-grounded answers
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </motion.div>
              <motion.h1 variants={rise(reduceMotion)}>
                Six months from now,
                <br />
                <span className="hp-hero-accent">you'll ask why you did this.</span>
              </motion.h1>
              <motion.p className="hp-hero-sub" variants={rise(reduceMotion)}>
                Knoledgr records the decisions your team makes and the reasoning behind
                them, links them to the pull requests that implemented them, and answers
                questions about any of it — with the sources attached.
              </motion.p>
              <motion.div className="hp-actions" variants={rise(reduceMotion)}>
                <Link to={appEntryHref} className="hp-button hp-button-primary hp-button-large">
                  {user ? "Open workspace" : "Start free"}
                  <ArrowLongRightIcon aria-hidden="true" />
                </Link>
                <a href="#product" className="hp-button hp-button-secondary hp-button-large">
                  See how it works
                </a>
              </motion.div>
              <motion.ul className="hp-proof" variants={rise(reduceMotion)}>
                <li><CheckCircleIcon aria-hidden="true" /> Connect GitHub in a minute</li>
                <li><CheckCircleIcon aria-hidden="true" /> Nothing to migrate</li>
              </motion.ul>
            </motion.div>

            <motion.div
              className="hp-hero-mock"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE, delay: reduceMotion ? 0 : 0.25 }}
            >
              <AskMock animate />
            </motion.div>
          </div>

          <div className="hp-container hp-works">
            <p className="hp-works-label">Where the reasoning usually gets buried</p>
            <div className="hp-works-row">
              {SOURCES.map(({ label, icon: Icon }) => (
                <span key={label} className="hp-works-chip"><Icon aria-hidden="true" /> {label}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Product / bento ---------- */}
        <section id="product" className="hp-product">
          <div className="hp-container">
            <div className="hp-product-intro" data-reveal>
              <span className="hp-eyebrow">How it holds together</span>
              <h2>A decision, and everything that led to it.</h2>
              <p>
                Not another place to do your work — a record of why the work went the way
                it did, wired to the tools you already use.
              </p>
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

              {/* GitHub — the wedge. Promoted to a first-class card because it is
                  the adoption path: one connect, no migration. */}
              <Link to="/integrations/github" className="hp-bento-card" data-reveal style={{ "--rd": "180ms" }}>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><CodeBracketIcon aria-hidden="true" /> GitHub</span>
                  <h3>The decision, next to the code that shipped it.</h3>
                  <p className="hp-bento-body">
                    Connect a repo and Knoledgr links merged pull requests back to the
                    decision they came from. Nothing to migrate.
                  </p>
                  <span className="hp-inline-link">Connect GitHub <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><GitHubMock /></div>
              </Link>

              {/* Knowledge graph — wide reversed */}
              <Link to={tryLink("/knowledge/graph")} className="hp-bento-card hp-bento-wide hp-bento-rev" data-reveal>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><LinkIcon aria-hidden="true" /> Knowledge Graph</span>
                  <h3>Follow the reasoning back as far as it goes.</h3>
                  <p className="hp-bento-body">
                    Every decision links to the threads, documents and people it came from —
                    and to the decisions it later replaced. Nothing is a dead end.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Graph" : "See the graph"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><KnowledgeGraphCanvas /></div>
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
                  <h4>Connect GitHub</h4>
                  <p>One repo is enough to start. You don't move anything, and nobody changes how they work.</p>
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
