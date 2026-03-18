import React from "react";
import { Link } from "react-router-dom";

const effectiveDate = "March 4, 2026";

export default function PrivacyEnterprise() {
  return (
    <div style={page}>
      <div style={container}>
        <Link to="/" style={backButton}>
          Back to Home
        </Link>
        <h1 style={title}>Knoledgr Enterprise Privacy Notice</h1>
        <p style={meta}>Effective Date: {effectiveDate}</p>
        <p style={meta}>Last Updated: {effectiveDate}</p>

        <Section title="1. Scope">
          This notice applies to Knoledgr enterprise services, including web
          apps, APIs, support channels, and enterprise integrations.
        </Section>

        <Section title="2. Roles">
          Knoledgr generally acts as a processor/service provider for Customer
          Content. The customer organization is controller/business. Knoledgr
          acts as controller for account, billing, security, and operational data.
        </Section>

        <Section title="3. Data Categories">
          We process account identifiers, workspace metadata, user-generated
          content, audit and access logs, support records, integration metadata,
          and billing records.
        </Section>

        <Section title="4. Purposes">
          We process data to provide and secure the service, enforce tenant
          isolation, perform support and incident response, provide analytics and
          AI features requested by customers, and meet legal obligations.
        </Section>

        <Section title="5. DPA and SCCs">
          Enterprise customers may execute Knoledgr's Data Processing Addendum
          (DPA). For restricted cross-border transfers, Knoledgr offers Standard
          Contractual Clauses (SCCs), including relevant transfer-impact and
          supplementary safeguards.
        </Section>

        <Section title="6. Subprocessors">
          Knoledgr uses vetted subprocessors for hosting, email, monitoring,
          support, billing, and AI services. Subprocessor engagements are under
          written contracts with confidentiality, security, and data-processing
          terms.
        </Section>

        <Section title="7. Security Controls">
          Technical and organizational controls are described in the Knoledgr
          Security Annex and include encryption in transit, access controls,
          audit logging, least privilege, and vulnerability management.
        </Section>

        <Section title="8. Retention and Deletion">
          Customer data is retained per contract and deleted or returned per
          documented offboarding procedures, subject to legal retention duties.
        </Section>

        <Section title="9. Data Subject Rights">
          Knoledgr supports enterprise customers in fulfilling rights requests
          (access, deletion, correction, portability, restriction, and objection)
          under applicable privacy laws.
        </Section>

        <Section title="10. Contact">
          Privacy and DPA requests: <a href="mailto:privacy@knoledgr.com">privacy@knoledgr.com</a>
        </Section>

        <div style={footerLinks}>
          <Link to="/terms" style={footerLink}>Terms of Service</Link>
          <Link to="/security-annex" style={footerLink}>Security Annex</Link>
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
  background: "linear-gradient(180deg, var(--app-text) 0%, var(--app-text) 100%)",
  color: "var(--app-border)",
  fontFamily: "'Segoe UI', Tahoma, sans-serif",
  padding: "28px 16px 40px",
};

const container = {
  maxWidth: 920,
  margin: "0 auto",
};

const backButton = {
  display: "inline-flex",
  textDecoration: "none",
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
  color: "var(--app-link)",
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
