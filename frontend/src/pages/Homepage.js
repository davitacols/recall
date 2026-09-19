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
  SparklesIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../hooks/useAuth";
import "./Homepage.css";

// Every tag here has to be something a buyer could ask us to demonstrate on a
// call. "SSO ready" was not: a workspace can store IdP settings, but no SAML
// assertion is ever consumed and no login path reads that configuration.
// Sitting in a list of security properties, a reader takes it as "supports
// SSO" — and it is the single claim most likely to be relied on in
// procurement. Put it back when there is a login flow behind it.
const SECURITY_TAGS = [
  "Role-based access",
  "Workspace isolation",
  "Encrypted in transit",
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

/* Ask Recall stays supporting proof: the decision loop is the product, while
   the assistant makes the accumulated evidence easy to retrieve. */
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

function DecisionLoopMock({ compact = false }) {
  const steps = [
    { number: "01", label: "Predict", detail: "Deploy failures stay below 2%", value: "Target 2%" },
    { number: "02", label: "Check", detail: "Observed after 30 days", value: "4.8%", drifted: true },
    { number: "03", label: "Learn", detail: "Keep releases inside staffed windows", value: "Retro open" },
  ];

  return (
    <div className={`mk mk-decision-loop ${compact ? "mk-sm" : ""}`}>
      <div className="mk-row mk-row-top">
        <span className="mk-tag">DEC-128</span>
        <span className="mk-lozenge mk-lozenge-green">Learning</span>
      </div>
      <p className="mk-title">Move releases to Friday mornings</p>
      <div className="mk-loop-list">
        {steps.map((step) => (
          <div className="mk-loop-step" key={step.number}>
            <span className="mk-loop-index">{step.number}</span>
            <span className="mk-loop-copy">
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
            </span>
            <span className={`mk-loop-value ${step.drifted ? "is-drift" : ""}`}>{step.value}</span>
          </div>
        ))}
      </div>
      <div className="mk-loop-lesson">
        <SparklesIcon aria-hidden="true" />
        Lesson will surface on the next similar decision.
      </div>
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

function PullRequestDecisionArtifact() {
  return (
    <div className="hp-review-artifact" aria-label="A pull request linked to a Knoledgr decision">
      <div className="hp-review-head">
        <span className="hp-review-repo">acme / platform</span>
        <span className="hp-review-number">pull / 412</span>
        <span className="hp-review-state"><i aria-hidden="true" /> merged</span>
      </div>

      <div className="hp-review-main">
        <div className="hp-review-title-row">
          <span className="hp-review-type">pull request</span>
          <span className="hp-review-branch">deploy-window → main</span>
        </div>
        <h3>Move deploy window to Friday AM</h3>
        <p className="hp-review-summary">2 files changed <span>+18</span> <em>−4</em></p>

        <div className="hp-review-thread">
          <span className="hp-review-avatar">PN</span>
          <div className="hp-review-comment">
            <div className="hp-review-comment-meta">
              <strong>priya-nair</strong>
              <span>commented on line 86</span>
            </div>
            <p>Friday mornings give us a staffed recovery window if the rollout drifts.</p>
          </div>
        </div>

        <div className="hp-review-link">
          <span className="hp-review-link-label">Knoledgr · linked context</span>
          <div className="hp-review-decision">
            <span className="hp-review-decision-id">DEC-128</span>
            <strong>Release inside staffed recovery windows</strong>
          </div>
          <dl>
            <div><dt>Expected</dt><dd>Failures below 2%</dd></div>
            <div><dt>Observed</dt><dd className="is-drift">4.8% · drift</dd></div>
            <div><dt>Next review</dt><dd>24 Oct</dd></div>
          </dl>
        </div>
      </div>

      <div className="hp-review-foot">
        <span>Context stays with the code.</span>
        <strong>Lesson returns at the next decision →</strong>
      </div>
    </div>
  );
}


export default function Homepage() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const appEntryHref = user ? "/dashboard" : "/login?mode=signup";
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

  const tryLink = (route) => (user ? route : appEntryHref);

  return (
    <div className="hp" ref={revealRef}>
      <header className={`hp-header ${isScrolled ? "hp-header-scrolled" : ""}`}>
        <div className="hp-container hp-header-row">
          <div className="hp-header-identity">
            <Link to="/" className="hp-brand-link" aria-label="Knoledgr homepage">
              <BrandLogo tone="warm" size="md" />
            </Link>
            <span className="hp-header-descriptor"><i aria-hidden="true" /> Decision memory</span>
          </div>
          <nav className="hp-nav" aria-label="Public navigation">
            <a href="#product"><span>01</span> Product</a>
            <a href="#how"><span>02</span> How it works</a>
            <Link to="/docs"><span>03</span> Docs</Link>
            <Link to="/partners"><span>04</span> Partners</Link>
          </nav>
          <div className="hp-header-actions">
            <Link to="/login" className="hp-text-link">Sign in</Link>
            <Link to={appEntryHref} className="hp-button hp-button-primary hp-header-cta">
              <CodeBracketIcon aria-hidden="true" />
              <span className="hp-header-cta-desktop">{user ? "Open workspace" : "Connect GitHub"}</span>
              <span className="hp-header-cta-mobile">{user ? "Open" : "Start free"}</span>
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
                <Link to={tryLink("/decisions/intelligence")} className="hp-hero-badge">
                  <span className="hp-hero-badge-pill">PR #412 → DEC-128</span>
                  Decision context, without another meeting
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </motion.div>
              <motion.h1 variants={rise(reduceMotion)}>
                The commit says what.
                <br />
                <span className="hp-hero-accent">Keep the why with it.</span>
              </motion.h1>
              <motion.p className="hp-hero-sub" variants={rise(reduceMotion)}>
                Knoledgr captures qualifying discussions around merged work, links them to
                the decision behind it, and brings the result back when your team faces the
                same tradeoff again.
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
                <li><CheckCircleIcon aria-hidden="true" /> GitHub App, no migration</li>
                <li><CheckCircleIcon aria-hidden="true" /> Free while we're in beta</li>
              </motion.ul>
            </motion.div>

            <motion.div
              className="hp-hero-mock"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE, delay: reduceMotion ? 0 : 0.25 }}
            >
              <PullRequestDecisionArtifact />
            </motion.div>
          </div>

          <div className="hp-container hp-works">
            <p className="hp-works-label">Context in. Decision memory out.</p>
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
              <h2>A learning loop, not another place to do the work.</h2>
              <p>
                Capture the reasoning, check the predicted outcome, and bring the lesson
                forward when the next similar decision starts.
              </p>
            </div>

            <div className="hp-bento">
              {/* Flagship — wide */}
              <Link to={tryLink("/decisions/intelligence")} className="hp-bento-card hp-bento-wide" data-reveal>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><SparklesIcon aria-hidden="true" /> Decision Intelligence</span>
                  <h3>Turn every important choice into a lesson the team can reuse.</h3>
                  <p className="hp-bento-body">
                    Log what you expect, then record what happened. Knoledgr compares the two,
                    flags drift, and opens a retrospective before the context disappears.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Decision Intelligence" : "Start learning from decisions"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><DecisionLoopMock compact /></div>
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

              {/* GitHub is the low-friction adoption path: one connection gives
                  the decision loop evidence without asking teams to migrate work. */}
              <Link to={tryLink("/integrations/github")} className="hp-bento-card" data-reveal style={{ "--rd": "180ms" }}>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><CodeBracketIcon aria-hidden="true" /> GitHub</span>
                  <h3>The decision, next to the code that shipped it.</h3>
                  <p className="hp-bento-body">
                    Capture meaningful discussions from merged pull requests, then link
                    the relevant PR to the decision it informed. Nothing to migrate.
                  </p>
                  <span className="hp-inline-link">Connect GitHub <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><GitHubMock /></div>
              </Link>

              {/* Ask Recall — wide reversed */}
              <Link to={tryLink("/ask")} className="hp-bento-card hp-bento-wide hp-bento-rev" data-reveal>
                <div className="hp-bento-copy">
                  <span className="hp-feature-eyebrow"><SparklesIcon aria-hidden="true" /> Ask Recall</span>
                  <h3>Ask what happened, and see the evidence behind the answer.</h3>
                  <p className="hp-bento-body">
                    Ask Recall pulls from decisions, conversations, documents, meetings, and tasks,
                    then shows which workspace sources support the response.
                  </p>
                  <span className="hp-inline-link">{user ? "Open Ask Recall" : "Try Ask Recall"} <ArrowRightIcon aria-hidden="true" /></span>
                </div>
                <div className="hp-bento-mock"><AskMock compact /></div>
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="hp-how">
          <div className="hp-container hp-how-grid">
            <div className="hp-how-copy" data-reveal>
              <span className="hp-eyebrow hp-eyebrow-light">How it works</span>
              <h2>Keep working normally. Knoledgr closes the learning loop.</h2>
              <p>
                GitHub and your workspace provide the context. Your team adds the expected
                result, and Knoledgr makes sure the outcome becomes reusable knowledge.
              </p>
            </div>
            <ol className="hp-steps">
              <li data-reveal>
                <span className="hp-step-num">01</span>
                <div>
                  <h4>Connect GitHub</h4>
                  <p>Capture qualifying discussions from merged pull requests as reusable context.</p>
                </div>
              </li>
              <li data-reveal style={{ "--rd": "110ms" }}>
                <span className="hp-step-num">02</span>
                <div>
                  <h4>Record the expected outcome</h4>
                  <p>Attach a measurable prediction and review date to the decision while context is fresh.</p>
                </div>
              </li>
              <li data-reveal style={{ "--rd": "220ms" }}>
                <span className="hp-step-num">03</span>
                <div>
                  <h4>Check reality and learn</h4>
                  <p>Drift opens a retrospective, and its lesson appears when a similar decision is drafted.</p>
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
            <h2>Make the next decision better than the last one.</h2>
            <p>Free while we're in beta. Connect one repository to start.</p>
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
        <div className="hp-container hp-footer-main">
          <div className="hp-footer-brand">
            <BrandLogo tone="warm" size="md" />
            <p>Decision memory for teams that ship software.</p>
          </div>

          <nav className="hp-footer-index" aria-label="Product links">
            <span className="hp-footer-label">Explore / 04</span>
            <Link to={tryLink("/decisions")}><span>01</span> Decisions <ArrowUpRightIcon aria-hidden="true" /></Link>
            <Link to={tryLink("/integrations/github")}><span>02</span> GitHub <ArrowUpRightIcon aria-hidden="true" /></Link>
            <Link to={tryLink("/ask")}><span>03</span> Ask Recall <ArrowUpRightIcon aria-hidden="true" /></Link>
            <Link to="/docs"><span>04</span> Docs <ArrowUpRightIcon aria-hidden="true" /></Link>
          </nav>

          <div className="hp-footer-status">
            <span className="hp-footer-label">Current release</span>
            <div className="hp-footer-status-line"><i aria-hidden="true" /> Public beta</div>
            <p>GitHub decision context is available now. Start with one repository.</p>
            <div className="hp-footer-reference-links">
              <Link to="/feedback">Feedback</Link>
              <Link to="/partners">Partners</Link>
              <Link to="/security-annex">Security</Link>
            </div>
          </div>
        </div>

        <div className="hp-container hp-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Knoledgr</span>
          <span className="hp-footer-coordinate">github → decision → outcome → lesson</span>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
