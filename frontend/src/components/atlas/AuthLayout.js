import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "../BrandLogo";

/**
 * AuthLayout — two-column auth shell.
 * Left: form column (brand → title/subtitle → children → footer).
 * Right: dark indigo showcase with a crafted Ask Recall card + value points.
 * Pass `sidePanel` to override the right column entirely.
 */
export default function AuthLayout({ children, title, subtitle, footer, sidePanel }) {
  return (
    <>
      <style>{AUTH_STYLES}</style>
      <div className="auth-shell atlas-auth-grid">
        <main className="auth-form-col">
          <div className="auth-form-top">
            <Link to="/" className="auth-brand">
              <BrandLogo size={26} tone="blue" showText={false} />
              <span>Knoledgr</span>
            </Link>
            <Link to="/" className="auth-back">
              <ArrowLeftIcon aria-hidden="true" />
              Home
            </Link>
          </div>

          <div className="auth-form-center">
            <div className="auth-card">
              {title ? <h1 className="auth-title">{title}</h1> : null}
              {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
              <div className="auth-form">{children}</div>
            </div>
          </div>

          {footer ? <footer className="auth-footer">{footer}</footer> : null}
        </main>

        <aside className="auth-side atlas-auth-panel">
          {sidePanel || <DefaultSidePanel />}
        </aside>
      </div>
    </>
  );
}

function DefaultSidePanel() {
  return (
    <div className="auth-side-inner">
      <div className="auth-side-head">
        <span className="auth-side-eyebrow">
          <SparklesIcon aria-hidden="true" /> Workspace memory
        </span>
        <h2>Your team already knows the answer.</h2>
        <p>
          Knoledgr keeps pages, decisions, meetings, and tasks connected — and gives
          you the source behind every answer.
        </p>
      </div>

      <div className="auth-mock" aria-hidden="true">
        <div className="auth-mock-prompt">
          <SparklesIcon aria-hidden="true" />
          <span>What did we decide about the rollout window?</span>
        </div>
        <p className="auth-mock-answer">
          Two weeks ago the team agreed to ship <strong>Friday mornings only</strong>,
          driven by the on-call rotation change. Owner: Priya.
        </p>
        <div className="auth-mock-chips">
          <span>DEC-128</span>
          <span>Sprint 42 retro</span>
          <span>Roadmap brief</span>
        </div>
      </div>

      <ul className="auth-points">
        <li><CheckCircleIcon aria-hidden="true" /> Source-grounded answers, not guesses</li>
        <li><CheckCircleIcon aria-hidden="true" /> Decisions with the why attached</li>
        <li><CheckCircleIcon aria-hidden="true" /> A knowledge graph that connects it all</li>
      </ul>
    </div>
  );
}

const AUTH_STYLES = `
.auth-shell {
  --ink: #0B0C10;
  --ink-soft: #3D4351;
  --muted: #6B7280;
  --line: #ECEDF1;
  --line-strong: #DCDEE5;
  --surface: #FFFFFF;
  --surface-soft: #F8F9FB;
  --surface-tint: #F2F3F7;
  --brand: #5E6AD2;
  --brand-deep: #4D55B3;
  --brand-tint: #EEEFFC;

  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  min-height: 100vh;
  background: var(--surface);
  color: var(--ink);
  font-family: "League Spartan", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.auth-shell *,
.auth-shell *::before,
.auth-shell *::after { box-sizing: border-box; }

/* ---------- Form column ---------- */

.auth-form-col {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 28px clamp(24px, 5vw, 56px) 32px;
  background: var(--surface);
  isolation: isolate;
}

.auth-form-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.012em;
}

.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 140ms ease, color 140ms ease;
}
.auth-back:hover { background: var(--surface-soft); color: var(--ink); }
.auth-back svg { width: 14px; height: 14px; }

.auth-form-center {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.auth-title {
  margin: 0;
  color: var(--ink);
  font-size: clamp(30px, 4vw, 38px);
  line-height: 1.05;
  font-weight: 760;
  letter-spacing: -0.034em;
}

.auth-subtitle {
  margin: 12px 0 0;
  color: var(--ink-soft);
  font-size: 16px;
  line-height: 1.55;
  max-width: 380px;
}

.auth-form { margin-top: 28px; }

/* Modernize the inputs only within this layout — don't touch global atlas-input */
.auth-form .atlas-input {
  height: 44px;
  padding: 0 13px;
  border-radius: 10px;
  border-width: 1px;
  border-color: var(--line-strong);
  background: var(--surface);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}
.auth-form .atlas-input:hover { border-color: var(--muted); }
.auth-form .atlas-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 4px rgba(94, 106, 210, 0.16);
  background: var(--surface);
}

/* Tab row for sign in / create */
.auth-form .atlas-tab-row {
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  border-radius: 12px;
  gap: 2px;
  margin-bottom: 24px;
}
.auth-form .atlas-tab {
  padding: 8px 15px;
  border-radius: 8px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.auth-form .atlas-tab:hover { color: var(--ink); }
.auth-form .atlas-tab[aria-selected="true"] {
  background: var(--surface);
  color: var(--brand-deep);
  box-shadow: 0 1px 2px rgba(11, 12, 16, 0.08);
}

/* Primary button override inside the auth layout — indigo */
.auth-form .atlas-btn--primary {
  height: 46px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--brand);
  color: #FFFFFF;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  border: none;
  box-shadow: 0 1px 2px rgba(11,12,16,0.16), inset 0 1px 0 rgba(255,255,255,0.18);
  transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}
.auth-form .atlas-btn--primary:hover:not(:disabled) {
  background: var(--brand-deep);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -10px rgba(94,106,210,0.7), inset 0 1px 0 rgba(255,255,255,0.18);
}

.auth-form a { color: var(--brand-deep); }

.auth-footer {
  margin-top: 24px;
  max-width: 420px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.55;
}
.auth-footer a { color: var(--ink-soft); }
.auth-footer a:hover { color: var(--ink); }

/* ---------- Side panel (dark indigo showcase) ---------- */

.auth-side {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(720px 460px at 100% 0%, rgba(138, 99, 210, 0.30), transparent 58%),
    radial-gradient(680px 460px at 0% 100%, rgba(94, 106, 210, 0.30), transparent 60%),
    #0B0C10;
}

.auth-side::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 34px 34px;
  -webkit-mask-image: radial-gradient(ellipse at 60% 40%, rgba(0, 0, 0, 0.6), transparent 75%);
  mask-image: radial-gradient(ellipse at 60% 40%, rgba(0, 0, 0, 0.6), transparent 75%);
  pointer-events: none;
}

.auth-side-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: 56px clamp(36px, 4.5vw, 72px);
  gap: 28px;
  max-width: 600px;
}

.auth-side-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #A6ABF5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.auth-side-eyebrow svg { width: 14px; height: 14px; }

.auth-side-head h2 {
  margin: 14px 0 0;
  color: #FFFFFF;
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1.08;
  font-weight: 760;
  letter-spacing: -0.032em;
}
.auth-side-head p {
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 15px;
  line-height: 1.6;
  max-width: 420px;
}

/* crafted answer card on dark */
.auth-mock {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  max-width: 440px;
}
.auth-mock-prompt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: #FFFFFF;
  font-size: 13.5px;
  font-weight: 500;
}
.auth-mock-prompt svg { width: 16px; height: 16px; color: #969BF0; }
.auth-mock-answer {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13.5px;
  line-height: 1.6;
}
.auth-mock-answer strong { color: #FFFFFF; font-weight: 600; }
.auth-mock-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.auth-mock-chips span {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(124, 130, 232, 0.18);
  color: #C7CCFB;
  font-size: 12px;
  font-weight: 600;
}

.auth-points {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.auth-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  font-weight: 500;
}
.auth-points svg { width: 18px; height: 18px; color: #86efac; flex-shrink: 0; }

/* ---------- Responsive ---------- */

@media (max-width: 959px) {
  .auth-shell { grid-template-columns: minmax(0, 1fr); }
  .auth-form-col { padding: 24px 20px 28px; }
  .auth-title { font-size: 30px; }
}
`;
