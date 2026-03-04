import React from "react";
import { useNavigate } from "react-router-dom";

const effectiveDate = "March 4, 2026";

export default function SecurityAnnex() {
  const navigate = useNavigate();

  return (
    <div style={page}>
      <div style={container}>
        <button onClick={() => navigate("/home")} style={backButton}>
          Back to Home
        </button>
        <h1 style={title}>Knoledgr Security Annex (Enterprise)</h1>
        <p style={meta}>Effective Date: {effectiveDate}</p>
        <p style={meta}>Reference Annex for DPA and Enterprise Orders</p>

        <Section title="1. Governance">
          Security ownership is assigned to designated personnel with documented
          policies for access control, incident handling, and change management.
        </Section>

        <Section title="2. Access Control">
          Access is restricted by role and least-privilege principles. Privileged
          access is reviewed and revoked when no longer required.
        </Section>

        <Section title="3. Encryption">
          Data is encrypted in transit using modern TLS and protected at rest
          using cloud-provider or platform-supported encryption mechanisms.
        </Section>

        <Section title="4. Logging and Monitoring">
          Authentication events, administrative actions, and key system events
          are logged and monitored for anomalous or unauthorized activity.
        </Section>

        <Section title="5. Vulnerability Management">
          Knoledgr applies risk-based patching, dependency reviews, and
          vulnerability remediation workflows for production services.
        </Section>

        <Section title="6. Incident Response">
          Knoledgr maintains incident response procedures that include triage,
          containment, investigation, remediation, and customer notification.
        </Section>

        <Section title="7. Business Continuity">
          Backup and recovery controls are maintained to support data durability
          and service restoration in line with operational requirements.
        </Section>

        <Section title="8. Subprocessor Security">
          Subprocessors are selected through security and contractual due
          diligence, and are bound by confidentiality and data-protection terms.
        </Section>

        <Section title="9. Contact">
          Security questions: <a href="mailto:security@knoledgr.com">security@knoledgr.com</a>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={section}>
      <h2 style={sectionTitle}>{title}</h2>
      <p style={copy}>{children}</p>
    </section>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
  color: "#e5e7eb",
  fontFamily: "'Segoe UI', Tahoma, sans-serif",
  padding: "28px 16px 40px",
};

const container = {
  maxWidth: 920,
  margin: "0 auto",
};

const backButton = {
  border: "1px solid #334155",
  background: "transparent",
  color: "#cbd5e1",
  padding: "8px 12px",
  cursor: "pointer",
  marginBottom: 14,
};

const title = {
  margin: "0 0 6px",
  fontSize: 34,
  lineHeight: 1.1,
};

const meta = {
  margin: "0 0 4px",
  color: "#93c5fd",
  fontSize: 14,
};

const section = {
  marginTop: 22,
  paddingTop: 14,
  borderTop: "1px solid #1f2937",
};

const sectionTitle = {
  margin: "0 0 8px",
  fontSize: 20,
  color: "#bfdbfe",
};

const copy = {
  margin: 0,
  lineHeight: 1.62,
  color: "#d1d5db",
};
