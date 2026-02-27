import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "Live Decision Timeline",
    description: "Track what changed, why it changed, and who approved it.",
  },
  {
    title: "Context Graph",
    description: "Link meetings, docs, tickets, and messages into one narrative.",
  },
  {
    title: "Knoledgr Assistant",
    description: "Ask one question and get answers grounded in your real history.",
  },
  {
    title: "Risk Radar",
    description: "Surface conflicting decisions before they become expensive.",
  },
];

const stats = [
  { value: "42%", label: "faster onboarding" },
  { value: "3.1x", label: "higher decision recall" },
  { value: "0 lost", label: "critical context threads" },
];

const steps = [
  {
    number: "01",
    title: "Capture",
    text: "Ingest meetings, docs, tickets, and chat with one unified timeline.",
  },
  {
    number: "02",
    title: "Connect",
    text: "Knoledgr links discussions to decisions, goals, and related artifacts.",
  },
  {
    number: "03",
    title: "Decide",
    text: "Teams get clear, auditable answers with sources and ownership.",
  },
];

const reelEvents = [
  { title: "Decision captured", time: "00:08", tone: "#8ff4c7" },
  { title: "Conflict detected", time: "00:16", tone: "#ffd99f" },
  { title: "Owner assigned", time: "00:22", tone: "#baf2ff" },
  { title: "Action synced", time: "00:29", tone: "#f7c4ff" },
];

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div style={page}>
      <div style={backgroundLayer} />

      <header style={header}>
        <div style={container}>
          <div style={headerContent}>
            <div style={brandRow}>
              <div style={brandMark} />
              <span style={brandText}>Knoledgr</span>
            </div>
            <div style={headerActions}>
              <button onClick={() => navigate("/login")} style={ghostButton}>
                Sign in
              </button>
              <button onClick={() => navigate("/login")} style={primaryButton}>
                Start free
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section style={heroSection}>
          <div style={container}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              style={heroGrid}
            >
              <div>
                <p style={eyebrow}>TEAM MEMORY PLATFORM</p>
                <h1 style={heroTitle}>
                  Decisions stay clear.
                  <br />
                  Momentum keeps moving.
                </h1>
                <p style={heroSubtitle}>
                  Knoledgr turns fragmented team knowledge into a living system
                  your company can trust.
                </p>
                <div style={ctaRow}>
                  <button
                    onClick={() => navigate("/login")}
                    style={primaryLargeButton}
                  >
                    Create workspace
                  </button>
                  <button style={secondaryLargeButton}>See product tour</button>
                </div>
                <p style={subtleLine}>No credit card required</p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.7 }}
                style={showcaseCard}
              >
                <p style={showcaseKicker}>Decision Health</p>
                <h3 style={showcaseTitle}>Q1 Product Strategy</h3>
                <p style={showcaseCopy}>
                  3 discussions aligned, 1 conflict flagged, owner assigned in
                  12 minutes.
                </p>

                <div style={timelineItem}>
                  <span style={pillGreen}>Aligned</span>
                  <span style={timelineText}>Roadmap and hiring plan linked</span>
                </div>
                <div style={timelineItem}>
                  <span style={pillAmber}>Needs Review</span>
                  <span style={timelineText}>Pricing assumptions differ</span>
                </div>
                <div style={timelineItem}>
                  <span style={pillBlue}>Resolved</span>
                  <span style={timelineText}>Source doc attached to decision</span>
                </div>
              </motion.div>
            </motion.div>

            <div style={statsGrid}>
              {stats.map((stat) => (
                <div key={stat.label} style={statCard}>
                  <p style={statValue}>{stat.value}</p>
                  <p style={statLabel}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={demoSection}>
          <div style={container}>
            <SectionHeading
              title="Watch Knoledgr in motion"
              subtitle="A live product-tour animation showing how context gets captured, linked, and resolved in real time."
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55 }}
              style={videoShell}
            >
              <div style={videoTopBar}>
                <span style={videoDotWarm} />
                <span style={videoDotCool} />
                <span style={videoDotMint} />
                <span style={videoTitle}>Knoledgr Product Tour</span>
              </div>

              <div style={videoBody}>
                <motion.div
                  animate={{ y: ["-14%", "108%"] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={scanLine}
                />

                <div style={reelColumn}>
                  <p style={reelKicker}>Live Event Timeline</p>
                  {reelEvents.map((event, index) => (
                    <motion.div
                      key={event.title}
                      animate={{ opacity: [0.35, 1, 0.35], x: [0, 4, 0] }}
                      transition={{
                        duration: 2.8,
                        delay: index * 0.35,
                        repeat: Infinity,
                        repeatDelay: 0.4,
                        ease: "easeInOut",
                      }}
                      style={reelEvent}
                    >
                      <span
                        style={{
                          ...eventTone,
                          background: `linear-gradient(135deg, ${event.tone}, rgba(255,255,255,0.16))`,
                        }}
                      />
                      <span style={reelEventText}>{event.title}</span>
                      <span style={reelEventTime}>{event.time}</span>
                    </motion.div>
                  ))}
                </div>

                <div style={reelColumn}>
                  <p style={reelKicker}>Context Graph Pulse</p>
                  <div style={graphShell}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ scale: [0.65, 1.35], opacity: [0.72, 0] }}
                        transition={{
                          duration: 2.6,
                          delay: i * 0.8,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                        style={pulseRing}
                      />
                    ))}
                    <span style={graphCore} />
                  </div>
                  <motion.div
                    animate={{ width: ["18%", "92%", "46%"] }}
                    transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                    style={confidenceBar}
                  />
                  <p style={graphCaption}>Confidence score updates as signals converge.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section style={section}>
          <div style={container}>
            <SectionHeading
              title="Built for teams that move fast"
              subtitle="One place to preserve institutional context without adding process overhead."
            />
            <div style={featureGrid}>
              {features.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: index * 0.05, duration: 0.45 }}
                  style={featureCard}
                >
                  <h3 style={featureTitle}>{feature.title}</h3>
                  <p style={featureDescription}>{feature.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section style={timelineSection}>
          <div style={container}>
            <SectionHeading
              title="How Knoledgr works"
              subtitle="Simple workflow, compounding value."
            />
            <div style={stepsGrid}>
              {steps.map((step) => (
                <div key={step.number} style={stepCard}>
                  <p style={stepNumber}>{step.number}</p>
                  <h3 style={stepTitle}>{step.title}</h3>
                  <p style={stepText}>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={ctaSection}>
          <div style={container}>
            <div style={ctaPanel}>
              <h2 style={ctaTitle}>Build a memory system your team can trust</h2>
              <p style={ctaSubtitle}>
                Start with one workspace. Scale with every decision you keep.
              </p>
              <div style={ctaRow}>
                <button onClick={() => navigate("/login")} style={darkButton}>
                  Get started free
                </button>
                <button
                  onClick={() => navigate("/login")}
                  style={lightOutlineButton}
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={footer}>
        <div style={container}>
          <div style={footerGrid}>
            <div>
              <div style={brandRow}>
                <div style={brandMark} />
                <span style={brandText}>Knoledgr</span>
              </div>
              <p style={footerCopy}>
                Keep decisions, context, and execution connected across your team.
              </p>
            </div>

            <div style={footerLinks}>
              <button onClick={() => navigate("/home")} style={footerLinkButton}>
                Product
              </button>
              <button onClick={() => navigate("/login")} style={footerLinkButton}>
                Pricing
              </button>
              <button onClick={() => navigate("/login")} style={footerLinkButton}>
                Sign in
              </button>
              <button onClick={() => navigate("/login")} style={footerLinkButton}>
                Start free
              </button>
            </div>
          </div>

          <div style={footerBottom}>
            <span>© {new Date().getFullYear()} Knoledgr. All rights reserved.</span>
            <div style={footerLegal}>
              <button style={footerMutedButton}>Privacy</button>
              <button style={footerMutedButton}>Terms</button>
              <button style={footerMutedButton}>Security</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const SectionHeading = ({ title, subtitle }) => (
  <div style={sectionHeading}>
    <h2 style={sectionTitle}>{title}</h2>
    <p style={sectionSubtitle}>{subtitle}</p>
  </div>
);

const page = {
  fontFamily: "'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#f4efe6",
  background:
    "radial-gradient(1000px 500px at 10% -10%, rgba(255,170,80,0.25), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(12,131,126,0.2), transparent 55%), #161012",
  minHeight: "100vh",
};

const backgroundLayer = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.03), transparent 28%, transparent 72%, rgba(255,255,255,0.02))",
};

const container = {
  width: "min(1120px, 92vw)",
  margin: "0 auto",
};

const header = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  padding: "16px 0",
  backdropFilter: "blur(10px)",
  background: "rgba(22,16,18,0.72)",
  borderBottom: "1px solid rgba(255,235,205,0.1)",
};

const headerContent = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const brandRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const brandMark = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background:
    "conic-gradient(from 220deg at 55% 55%, #ff8d4f, #ffd08d 40%, #0e9a8f 70%, #ff8d4f)",
};

const brandText = {
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: "-0.01em",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const baseButton = {
  borderRadius: 12,
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const ghostButton = {
  ...baseButton,
  color: "#f4efe6",
  border: "1px solid rgba(255,235,205,0.2)",
  background: "rgba(255,255,255,0.02)",
};

const primaryButton = {
  ...baseButton,
  color: "#161012",
  border: "none",
  background: "linear-gradient(135deg, #ffd390, #ff9f62)",
};

const heroSection = {
  padding: "78px 0 72px",
};

const heroGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 26,
  alignItems: "stretch",
};

const eyebrow = {
  fontSize: 12,
  letterSpacing: "0.22em",
  color: "rgba(255,233,203,0.72)",
  marginBottom: 14,
};

const heroTitle = {
  fontSize: "clamp(2rem, 5.8vw, 4.3rem)",
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
  margin: 0,
};

const heroSubtitle = {
  marginTop: 18,
  color: "rgba(244,239,230,0.82)",
  maxWidth: 560,
  fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
  lineHeight: 1.55,
};

const ctaRow = {
  display: "flex",
  gap: 12,
  marginTop: 28,
  flexWrap: "wrap",
};

const primaryLargeButton = {
  ...primaryButton,
  padding: "13px 20px",
  fontSize: 15,
};

const secondaryLargeButton = {
  ...ghostButton,
  padding: "13px 20px",
  fontSize: 15,
};

const subtleLine = {
  marginTop: 12,
  fontSize: 13,
  color: "rgba(244,239,230,0.56)",
};

const showcaseCard = {
  borderRadius: 22,
  padding: 24,
  border: "1px solid rgba(255,231,198,0.16)",
  background:
    "linear-gradient(170deg, rgba(11,90,86,0.35), rgba(55,33,25,0.35) 55%, rgba(14,14,18,0.65))",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const showcaseKicker = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.15em",
  color: "rgba(244,239,230,0.65)",
};

const showcaseTitle = {
  fontSize: 28,
  margin: "12px 0 10px",
};

const showcaseCopy = {
  margin: "0 0 18px",
  color: "rgba(244,239,230,0.86)",
  lineHeight: 1.5,
};

const timelineItem = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const basePill = {
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const pillGreen = {
  ...basePill,
  background: "rgba(70,193,143,0.18)",
  color: "#8ff4c7",
};

const pillAmber = {
  ...basePill,
  background: "rgba(255,195,99,0.18)",
  color: "#ffd99f",
};

const pillBlue = {
  ...basePill,
  background: "rgba(109,214,234,0.2)",
  color: "#baf2ff",
};

const timelineText = {
  fontSize: 14,
  color: "rgba(244,239,230,0.92)",
};

const statsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const statCard = {
  border: "1px solid rgba(255,231,198,0.12)",
  borderRadius: 14,
  padding: "16px 18px",
  background: "rgba(255,255,255,0.02)",
};

const statValue = {
  margin: 0,
  fontWeight: 700,
  fontSize: 28,
  color: "#ffd390",
};

const statLabel = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "rgba(244,239,230,0.76)",
};

const section = {
  padding: "52px 0 68px",
};

const demoSection = {
  padding: "20px 0 62px",
};

const videoShell = {
  borderRadius: 20,
  border: "1px solid rgba(255,231,198,0.14)",
  background: "linear-gradient(160deg, rgba(6,56,53,0.34), rgba(20,16,18,0.95) 62%)",
  boxShadow: "0 26px 70px rgba(0,0,0,0.38)",
  overflow: "hidden",
};

const videoTopBar = {
  height: 48,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px",
  borderBottom: "1px solid rgba(255,231,198,0.12)",
  background: "rgba(255,255,255,0.02)",
};

const baseDot = {
  width: 10,
  height: 10,
  borderRadius: 999,
};

const videoDotWarm = {
  ...baseDot,
  background: "#ff9f62",
};

const videoDotCool = {
  ...baseDot,
  background: "#ffd390",
};

const videoDotMint = {
  ...baseDot,
  background: "#72d9c8",
};

const videoTitle = {
  marginLeft: 8,
  fontSize: 13,
  letterSpacing: "0.04em",
  color: "rgba(244,239,230,0.75)",
  textTransform: "uppercase",
};

const videoBody = {
  position: "relative",
  padding: "clamp(16px,3vw,24px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const scanLine = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 2,
  background: "linear-gradient(90deg, transparent, rgba(114,217,200,0.85), transparent)",
  boxShadow: "0 0 18px rgba(114,217,200,0.55)",
  pointerEvents: "none",
};

const reelColumn = {
  border: "1px solid rgba(255,231,198,0.12)",
  borderRadius: 14,
  padding: 14,
  background: "rgba(255,255,255,0.02)",
};

const reelKicker = {
  margin: "0 0 10px",
  fontSize: 11,
  letterSpacing: "0.14em",
  color: "rgba(244,239,230,0.65)",
  textTransform: "uppercase",
};

const reelEvent = {
  display: "grid",
  gridTemplateColumns: "10px 1fr auto",
  alignItems: "center",
  gap: 10,
  borderRadius: 10,
  padding: "10px 10px",
  background: "rgba(0,0,0,0.24)",
  border: "1px solid rgba(255,255,255,0.07)",
  marginBottom: 8,
};

const eventTone = {
  width: 10,
  height: 10,
  borderRadius: 999,
};

const reelEventText = {
  fontSize: 14,
  color: "rgba(244,239,230,0.94)",
};

const reelEventTime = {
  fontSize: 12,
  color: "rgba(244,239,230,0.64)",
  fontFeatureSettings: '"tnum" 1',
};

const graphShell = {
  position: "relative",
  width: 120,
  height: 120,
  margin: "6px auto 16px",
  display: "grid",
  placeItems: "center",
};

const pulseRing = {
  position: "absolute",
  width: 90,
  height: 90,
  borderRadius: "50%",
  border: "1px solid rgba(114,217,200,0.8)",
};

const graphCore = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "radial-gradient(circle at 35% 35%, #e8fff9, #72d9c8 60%, #1c7f74)",
  boxShadow: "0 0 24px rgba(114,217,200,0.55)",
};

const confidenceBar = {
  height: 12,
  borderRadius: 999,
  background: "linear-gradient(90deg,#72d9c8,#ffd390,#ff9f62)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
};

const graphCaption = {
  margin: "10px 0 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "rgba(244,239,230,0.76)",
};

const sectionHeading = {
  textAlign: "center",
  marginBottom: 34,
};

const sectionTitle = {
  fontSize: "clamp(1.7rem, 3.8vw, 2.7rem)",
  margin: 0,
  letterSpacing: "-0.02em",
};

const sectionSubtitle = {
  margin: "10px auto 0",
  maxWidth: 680,
  color: "rgba(244,239,230,0.72)",
  lineHeight: 1.55,
};

const featureGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const featureCard = {
  padding: 20,
  borderRadius: 16,
  border: "1px solid rgba(255,231,198,0.12)",
  background:
    "linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
};

const featureTitle = {
  margin: "0 0 8px",
  fontSize: 20,
  letterSpacing: "-0.01em",
};

const featureDescription = {
  margin: 0,
  color: "rgba(244,239,230,0.72)",
  lineHeight: 1.5,
};

const timelineSection = {
  padding: "68px 0",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
  borderTop: "1px solid rgba(255,231,198,0.08)",
  borderBottom: "1px solid rgba(255,231,198,0.08)",
};

const stepsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const stepCard = {
  borderRadius: 16,
  padding: 20,
  border: "1px solid rgba(255,231,198,0.1)",
  background: "rgba(0,0,0,0.14)",
};

const stepNumber = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.18em",
  color: "rgba(255,227,191,0.62)",
};

const stepTitle = {
  margin: "10px 0 8px",
  fontSize: 22,
};

const stepText = {
  margin: 0,
  color: "rgba(244,239,230,0.74)",
  lineHeight: 1.5,
};

const ctaSection = {
  padding: "74px 0 90px",
};

const ctaPanel = {
  borderRadius: 24,
  padding: "clamp(24px, 5vw, 42px)",
  background:
    "linear-gradient(140deg, rgba(255,165,96,0.94), rgba(255,211,144,0.94) 46%, rgba(128,240,215,0.9))",
  color: "#221612",
  boxShadow: "0 18px 60px rgba(0,0,0,0.3)",
};

const ctaTitle = {
  margin: 0,
  fontSize: "clamp(1.8rem, 4vw, 3rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const ctaSubtitle = {
  marginTop: 12,
  marginBottom: 0,
  maxWidth: 640,
  lineHeight: 1.5,
  color: "rgba(34,22,18,0.84)",
};

const darkButton = {
  ...baseButton,
  background: "#231713",
  color: "#ffe7cf",
  border: "1px solid rgba(255,231,198,0.3)",
  padding: "13px 20px",
};

const lightOutlineButton = {
  ...baseButton,
  background: "transparent",
  color: "#231713",
  border: "1px solid rgba(35,23,19,0.38)",
  padding: "13px 20px",
};

const footer = {
  borderTop: "1px solid rgba(255,231,198,0.12)",
  background: "rgba(10,8,9,0.55)",
  backdropFilter: "blur(8px)",
};

const footerGrid = {
  padding: "26px 0 18px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  alignItems: "end",
};

const footerCopy = {
  margin: "10px 0 0",
  color: "rgba(244,239,230,0.68)",
  fontSize: 13,
  maxWidth: 420,
  lineHeight: 1.5,
};

const footerLinks = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const footerLinkButton = {
  border: "1px solid rgba(255,231,198,0.14)",
  background: "rgba(255,255,255,0.02)",
  color: "#f4efe6",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const footerBottom = {
  padding: "12px 0 22px",
  borderTop: "1px solid rgba(255,231,198,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  color: "rgba(244,239,230,0.58)",
  fontSize: 12,
};

const footerLegal = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const footerMutedButton = {
  border: "none",
  background: "transparent",
  color: "rgba(244,239,230,0.58)",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
};

