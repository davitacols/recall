import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Homepage.css";

const heroWords = ["focused.", "auditable.", "searchable.", "unblocked."];

const principles = [
  {
    title: "Capture once",
    text: "Meetings, docs, tickets, and chat become one living timeline.",
  },
  {
    title: "Connect context",
    text: "Every decision links to rationale, owner, and downstream work.",
  },
  {
    title: "Move with clarity",
    text: "Teams ship faster when everyone can see why a call was made.",
  },
];

const modules = [
  {
    name: "Decision Feed",
    detail: "Immutable timeline with approvals, revisions, and owners.",
    tag: "Core",
  },
  {
    name: "Context Graph",
    detail: "Map conversations to tasks, metrics, and artifacts.",
    tag: "Intelligence",
  },
  {
    name: "Risk Radar",
    detail: "Detect conflicting assumptions before they become expensive.",
    tag: "Alerting",
  },
  {
    name: "AI Retrieval",
    detail: "Answers grounded in real organizational memory.",
    tag: "Assistant",
  },
];

const highlights = [
  { value: "42%", label: "faster onboarding" },
  { value: "3.1x", label: "better decision recall" },
  { value: "0", label: "critical context lost" },
];

const liveEvents = [
  { title: "Pricing decision updated", time: "08:42" },
  { title: "Risk signal: scope conflict", time: "08:46" },
  { title: "Owner confirmed by PM", time: "08:51" },
  { title: "Roadmap synced to sprint", time: "08:55" },
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
          <BrandLogo tone="dark" size="lg" />
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
              <p className="hp-eyebrow">KNOLEDGR PLATFORM</p>
              <h1 className="hp-title">
                Keep your team
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
                Built like an operations console: clear hierarchy, fast scanning,
                and decision memory that compounds over time.
              </p>
              <div className="hp-actions">
                <button
                  onClick={() => navigate("/login")}
                  className="hp-btn hp-btn-primary hp-btn-lg"
                >
                  Create your workspace
                </button>
                <button className="hp-btn hp-btn-ghost hp-btn-lg">
                  View product tour
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
                <p>Live Decision Console</p>
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
              <h2>Simple flow. Durable alignment.</h2>
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
              <p>Product Surface</p>
              <h2>A product surface that feels premium and operational</h2>
              <p>
                Inspired by the confidence of Uber interfaces and the calm clarity
                of Notion: minimal noise, strong typography, and deliberate
                spacing.
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
            <h2>Turn decisions into an unfair advantage</h2>
            <p>Start with one workspace. Compound value with every call you keep.</p>
            <div className="hp-actions">
              <button
                onClick={() => navigate("/login")}
                className="hp-btn hp-btn-ink hp-btn-lg"
              >
                Get started free
              </button>
              <button
                onClick={() => navigate("/login")}
                className="hp-btn hp-btn-line hp-btn-lg"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
