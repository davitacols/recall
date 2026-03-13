import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Homepage.css";

const heroWords = ["searchable.", "grounded.", "traceable.", "usable."];

const principles = [
  {
    title: "Capture",
    text: "Record decisions, conversations, and documents as work happens.",
  },
  {
    title: "Connect",
    text: "Link rationale, owners, related discussions, and downstream work.",
  },
  {
    title: "Retrieve",
    text: "Ask a question and recover the real why behind the work in seconds.",
  },
];

const modules = [
  {
    name: "Decision Log",
    detail: "Capture key decisions with rationale, owners, approvals, and impact.",
    tag: "Core",
  },
  {
    name: "Context Graph",
    detail: "Connect conversations, documents, projects, and historical signals.",
    tag: "Intelligence",
  },
  {
    name: "Ask Knoledgr",
    detail: "Get grounded answers from your team's actual history, not generic AI.",
    tag: "Assistant",
  },
  {
    name: "Operational Memory",
    detail: "Turn scattered activity into a usable record for alignment and onboarding.",
    tag: "Memory",
  },
];

const highlights = [
  { value: "< 60s", label: "to recover decision context" },
  { value: "1", label: "place to trace the why" },
  { value: "24/7", label: "grounded answers from team history" },
];

const liveEvents = [
  { title: "Pricing decision approved with rationale", time: "08:42" },
  { title: "Related onboarding discussion linked", time: "08:46" },
  { title: "Previous rollout risk surfaced", time: "08:51" },
  { title: "Next action assigned to product lead", time: "08:55" },
];

export default function Homepage() {
  const navigate = useNavigate();
  const [heroWordIndex, setHeroWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 2100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hp">
      <div className="hp-noise" />
      <div className="hp-orb hp-orb-a" />
      <div className="hp-orb hp-orb-b" />

      <header className="hp-header">
        <div className="hp-container hp-header-row">
          <BrandLogo tone="light" size="lg" />
          <div className="hp-header-actions">
            <button
              onClick={() => navigate("/login")}
              className="hp-btn hp-btn-ghost"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/login")}
              className="hp-btn hp-btn-primary"
            >
              Get started free
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hp-hero">
          <div className="hp-container hp-hero-grid">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="hp-eyebrow">DECISION MEMORY FOR TEAMS</p>
              <h1 className="hp-title">
                Your team's decision memory,
                <span className="hp-word-slot">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={heroWords[heroWordIndex]}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="hp-word"
                    >
                      {heroWords[heroWordIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </h1>
              <p className="hp-subtitle">
                Knoledgr captures decisions, discussions, and downstream work in
                one context layer, so teams stop repeating debates and recover the
                real why behind execution.
              </p>
              <div className="hp-actions">
                <button
                  onClick={() => navigate("/login")}
                  className="hp-btn hp-btn-primary hp-btn-lg"
                >
                  Start your workspace
                </button>
                <button
                  onClick={() => navigate("/docs")}
                  className="hp-btn hp-btn-ghost hp-btn-lg"
                >
                  See how Ask Knoledgr works
                </button>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="hp-console"
            >
              <div className="hp-console-head">
                <span />
                <span />
                <span />
                <p>Live Context Console</p>
              </div>
              <div className="hp-console-body">
                {liveEvents.map((event) => (
                  <div key={event.title} className="hp-event">
                    <div className="hp-event-dot" />
                    <p>{event.title}</p>
                    <span>{event.time}</span>
                  </div>
                ))}
              </div>
            </motion.aside>
          </div>

          <div className="hp-container hp-stats">
            {highlights.map((item) => (
              <div key={item.label} className="hp-stat-card">
                <p className="hp-stat-value">{item.value}</p>
                <p className="hp-stat-label">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="hp-section">
          <div className="hp-container">
            <div className="hp-section-head">
              <p>How It Works</p>
              <h2>Simple flow. Durable team memory.</h2>
            </div>
            <div className="hp-principles">
              {principles.map((item, idx) => (
                <motion.article
                  key={item.title}
                  className="hp-principle-card"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                >
                  <span>{`0${idx + 1}`}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-section hp-section-tight">
          <div className="hp-container hp-bento">
            <div className="hp-bento-lead">
              <p>Why teams use Knoledgr</p>
              <h2>Because work breaks when context disappears</h2>
              <p>
                Slack has the conversation. Jira has the task. Notion has the
                document. Knoledgr connects the why, so your team can trace what
                happened, why it happened, and what to do next.
              </p>
            </div>
            <div className="hp-modules">
              {modules.map((module) => (
                <article key={module.name} className="hp-module-card">
                  <span>{module.tag}</span>
                  <h3>{module.name}</h3>
                  <p>{module.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-container hp-cta-panel">
            <h2>Stop re-deciding what your team already learned</h2>
            <p>Preserve context, recover grounded answers, and help people act with confidence.</p>
            <div className="hp-actions">
              <button
                onClick={() => navigate("/login")}
                className="hp-btn hp-btn-ink hp-btn-lg"
              >
                Get started free
              </button>
              <button
                onClick={() => navigate("/docs")}
                className="hp-btn hp-btn-line hp-btn-lg"
              >
                Book a walkthrough
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
