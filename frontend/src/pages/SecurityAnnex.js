import React from "react";
import PublicPolicyPage from "../components/PublicPolicyPage";

const effectiveDate = "March 22, 2026";

const summaryCards = [
  {
    title: "Control areas",
    text: "Program governance, identity and access, tenant isolation, secure delivery, monitoring, incident response, resilience, and vendor oversight.",
  },
  {
    title: "How to read this",
    text: "This annex summarizes representative technical and organizational controls and works alongside customer-specific reviews, exhibits, or security questionnaires.",
  },
  {
    title: "Shared responsibility",
    text: "Knoledgr secures the platform, while customers remain responsible for their role design, data choices, integrations, and internal usage policies.",
  },
];

const sections = [
  {
    id: "program",
    title: "1. Security program governance",
    paragraphs: [
      "Knoledgr maintains a security program intended to support product reliability, organization isolation, controlled operations, and incident readiness across the web application, APIs, supporting infrastructure, and related service workflows.",
      "Security controls, priorities, and operational practices may evolve over time as the product, threat environment, and customer requirements change. Customer-specific commitments can be documented in separate enterprise agreements, questionnaires, or security exhibits.",
    ],
  },
  {
    id: "identity-access",
    title: "2. Identity, authentication, and privileged access",
    bullets: [
      "Access to administrative, operational, and production systems is intended to follow role-based and least-privilege principles.",
      "Privileged actions are limited to authorized personnel and are expected to occur through authenticated workflows and reviewed operational procedures.",
      "Customer organizations are responsible for managing their own workspace roles, invited users, connected identities, and the internal trust decisions they make when granting access.",
    ],
  },
  {
    id: "encryption-secrets",
    title: "3. Encryption, transport protection, and secret handling",
    bullets: [
      "Knoledgr is designed to use TLS or equivalent protections for data transmitted over public networks.",
      "Sensitive credentials, tokens, and service secrets are intended to be handled through restricted operational workflows rather than broadly exposed in application logic or user-visible interfaces.",
      "Storage, credential, and key-handling practices may vary by infrastructure component, provider, and service configuration.",
    ],
  },
  {
    id: "isolation",
    title: "4. Tenant isolation and environment separation",
    paragraphs: [
      "Product and backend workflows are designed around organization-scoped access patterns so that customer records, collaboration objects, and operational reads stay isolated to the authenticated customer organization except where an intentionally restricted platform-administration function applies.",
      "Knoledgr also seeks to maintain separation between production operations and non-production work as part of its broader secure delivery practices.",
    ],
  },
  {
    id: "delivery",
    title: "5. Secure development and change management",
    bullets: [
      "Application updates, infrastructure changes, and operational improvements are expected to move through controlled development and deployment workflows rather than unmanaged direct changes.",
      "Knoledgr uses code review, issue tracking, testing, and release practices intended to reduce the likelihood of unsafe changes reaching customers.",
      "Not every security or quality control applies identically to every experimental, preview, or internal workflow, especially when a feature is in early release.",
    ],
  },
  {
    id: "monitoring",
    title: "6. Logging, monitoring, and vulnerability management",
    bullets: [
      "Knoledgr maintains audit and operational logging intended to support troubleshooting, access review, abuse investigation, and incident response.",
      "Monitoring and alerting are used to surface abnormal behavior, reliability concerns, and security-relevant signals where operationally appropriate.",
      "Security issues are reviewed through remediation workflows that take into account severity, exposure, exploitability, and customer impact, with faster handling for higher-risk issues.",
    ],
  },
  {
    id: "incident-response",
    title: "7. Incident response and customer communication",
    paragraphs: [
      "Knoledgr maintains incident response procedures intended to support triage, investigation, containment, remediation, recovery, and follow-up review.",
      "Where Knoledgr confirms a security incident affecting customer data and applicable agreements require notice, customers are informed without undue delay and with the level of detail reasonably available at the time.",
    ],
  },
  {
    id: "resilience",
    title: "8. Resilience, continuity, and recovery",
    bullets: [
      "Service continuity is supported through operational monitoring, controlled deployment practices, and infrastructure configurations intended to reduce the impact of component failures and service interruptions.",
      "Recovery approaches, retention windows, and backup behavior may depend on the service component, hosting provider, customer plan, or negotiated enterprise commitments.",
      "Customers should maintain their own business continuity planning for downstream workflows, exported records, and internal dependencies outside the Knoledgr platform.",
    ],
  },
  {
    id: "vendors",
    title: "9. Vendor, hosting, and subprocessor oversight",
    bullets: [
      "Knoledgr may rely on third-party providers for infrastructure, communications, monitoring, billing, storage, and AI or model functionality.",
      "Third-party services are selected and managed according to contractual, operational, and security expectations appropriate to the service provided, though customers should understand that third-party dependencies introduce their own availability and risk profiles.",
      "Enterprise customers may request additional information through security review channels or negotiated procurement processes.",
    ],
  },
  {
    id: "customer-responsibilities",
    title: "10. Customer responsibilities and configuration choices",
    bullets: [
      "Customers are responsible for selecting what data they put into the service, how they configure roles and sharing, which integrations they connect, and how their personnel use the platform.",
      "Customers should review whether their own regulatory, contractual, residency, retention, or internal security requirements require additional controls, configuration, or negotiated commitments.",
      "AI-assisted features, connectors, imports, exports, and administrator tools should be used in line with the customer's own governance standards.",
    ],
  },
  {
    id: "assurance",
    title: "11. Assurance materials, reviews, and contact",
    paragraphs: [
      "This annex is intended as a public summary, not an exhaustive technical specification. More detailed answers may be provided under NDA, during procurement review, or through enterprise security questionnaires where appropriate.",
      "Security, assurance, and enterprise review requests can be directed to Knoledgr's security contact.",
    ],
    bullets: [
      "Security and assurance requests: security@knoledgr.com",
      "Legal and procurement coordination: legal@knoledgr.com",
      "Privacy and data protection requests: privacy@knoledgr.com",
    ],
  },
];

export default function SecurityAnnex() {
  return (
    <PublicPolicyPage
      eyebrow="Security"
      title="Knoledgr Security Annex"
      lead="This annex summarizes the technical and organizational safeguards Knoledgr uses to support tenant isolation, secure delivery, operational resilience, and enterprise assurance across the platform."
      effectiveDate={effectiveDate}
      updatedDate={effectiveDate}
      contactLabel="Security Contact"
      contactEmail="security@knoledgr.com"
      summaryCards={summaryCards}
      sections={sections}
      footerLinks={[
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/feedback", label: "Feedback" },
      ]}
    />
  );
}
