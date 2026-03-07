import React from "react";
import { useNavigate } from "react-router-dom";

const effectiveDate = "March 4, 2026";

export default function TermsEnterprise() {
  const navigate = useNavigate();

  return (
    <div style={page}>
      <div style={container}>
        <button onClick={() => navigate("/home")} style={backButton}>
          Back to Home
        </button>
        <h1 style={title}>Knoledgr Enterprise Terms of Service</h1>
        <p style={meta}>Effective Date: {effectiveDate}</p>
        <p style={meta}>Last Updated: {effectiveDate}</p>

        <Section title="1. Agreement Scope">
          These terms govern enterprise use of Knoledgr by customer
          organizations and their authorized users.
        </Section>

        <Section title="2. Order Forms and Priority">
          In case of conflict, the order of precedence is: signed Order Form,
          executed DPA, Security Annex, and then these Terms.
        </Section>

        <Section title="3. Customer Data and Processing">
          Customer retains rights in Customer Data. Knoledgr processes Customer
          Data only as needed to deliver the service and according to customer
          instructions documented in the agreement.
        </Section>

        <Section title="4. DPA and SCCs">
          Knoledgr's Data Processing Addendum (DPA) forms part of the enterprise
          contract. Where required, cross-border transfers are governed by
          Standard Contractual Clauses (SCCs) and supporting safeguards.
        </Section>

        <Section title="5. Security Annex">
          Security obligations and controls are detailed in the Security Annex,
          including access management, encryption standards, incident response,
          vulnerability management, logging, and continuity controls.
        </Section>

        <Section title="6. Availability and Support">
          Service levels, support response targets, and service credits (if any)
          are defined in customer-specific order forms or enterprise exhibits.
        </Section>

        <Section title="7. Confidentiality">
          Each party will protect confidential information using at least
          reasonable care and use it only for contract performance, subject to
          legal disclosure obligations.
        </Section>

        <Section title="8. Security Incidents">
          Knoledgr will notify customers without undue delay after confirming a
          security incident affecting Customer Data and provide available
          remediation details.
        </Section>

        <Section title="9. Audit and Assurance">
          Knoledgr may provide security documentation and audit summaries under
          NDA. Additional audit rights are subject to enterprise contract terms.
        </Section>

        <Section title="10. Liability and Indemnity">
          Liability caps, exclusions, and indemnity obligations are governed by
          the signed enterprise agreement or order form.
        </Section>

        <Section title="11. Contact">
          Legal and enterprise terms: <a href="mailto:legal@knoledgr.com">legal@knoledgr.com</a>
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
  background: "linear-gradient(180deg, #0b1222 0%, var(--app-text) 100%)",
  color: "var(--app-border)",
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
