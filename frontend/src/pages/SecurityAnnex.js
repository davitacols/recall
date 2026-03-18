import React from "react";
import { Link } from "react-router-dom";

const effectiveDate = "March 18, 2026";

export default function SecurityAnnex() {
  return (
    <div style={page}>
      <div style={container}>
        <Link to="/" style={backLink}>
          Back to Home
        </Link>
        <h1 style={title}>Knoledgr Security Annex</h1>
        <p style={meta}>Effective Date: {effectiveDate}</p>
        <p style={meta}>Last Updated: {effectiveDate}</p>

        <Section title="1. Security Program">
          Knoledgr maintains a security program designed to protect customer data, preserve organization isolation, and support secure product delivery across the web app, APIs, and supporting infrastructure.
        </Section>

        <Section title="2. Access Control">
          Access to production systems is restricted by role, least-privilege principles, and authenticated workflows. Administrative actions are limited to authorized personnel and governed by logged access patterns and internal review.
        </Section>

        <Section title="3. Encryption">
          Data is protected in transit using TLS. Platform controls are designed to support secure storage practices, protected credentials, and restricted access to sensitive system components.
        </Section>

        <Section title="4. Logging and Monitoring">
          Knoledgr maintains audit and operational logs to support troubleshooting, access review, and incident response. Monitoring and alerting are used to surface abnormal behavior, service degradation, and security-relevant events.
        </Section>

        <Section title="5. Tenant Isolation">
          Product and backend workflows are designed around organization-scoped access. Customer records, collaboration objects, and related operational reads are intended to remain isolated to the authenticated customer organization.
        </Section>

        <Section title="6. Vulnerability Management">
          Knoledgr reviews security issues through an internal remediation workflow that prioritizes severity, exposure, and customer impact. High-risk issues are handled on an accelerated schedule.
        </Section>

        <Section title="7. Incident Response">
          Knoledgr maintains incident response procedures for triage, containment, remediation, and customer communication. Enterprise customers are notified of confirmed incidents affecting Customer Data without undue delay.
        </Section>

        <Section title="8. Resilience and Continuity">
          Service continuity is supported through operational monitoring, controlled deployment workflows, and infrastructure practices intended to reduce the impact of component failures or service interruptions.
        </Section>

        <Section title="9. Vendor and Subprocessor Controls">
          Third-party providers used for infrastructure, monitoring, communication, or related services are evaluated through contractual and security expectations appropriate to the service provided.
        </Section>

        <Section title="10. Contact">
          Security and enterprise assurance requests: <a href="mailto:security@knoledgr.com">security@knoledgr.com</a>
        </Section>

        <div style={footerLinks}>
          <Link to="/privacy" style={footerLink}>Privacy Notice</Link>
          <Link to="/terms" style={footerLink}>Terms of Service</Link>
        </div>
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
  background: "linear-gradient(180deg, #08111d 0%, #0f172a 100%)",
  color: "#e5eefb",
  fontFamily: "'Segoe UI', Tahoma, sans-serif",
  padding: "28px 16px 40px",
};

const container = {
  maxWidth: 920,
  margin: "0 auto",
};

const backLink = {
  display: "inline-flex",
  textDecoration: "none",
  border: "1px solid #334155",
  color: "#cbd5e1",
  padding: "8px 12px",
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
  borderTop: "1px solid #1e293b",
};

const sectionTitle = {
  margin: "0 0 8px",
  fontSize: 20,
  color: "#bfdbfe",
};

const copy = {
  margin: 0,
  lineHeight: 1.68,
  color: "#dbe7f5",
};

const footerLinks = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 28,
};

const footerLink = {
  color: "#93c5fd",
  textDecoration: "none",
};
