import React from "react";
import PublicPolicyPage from "../components/PublicPolicyPage";

const effectiveDate = "March 22, 2026";

const summaryCards = [
  {
    title: "What this covers",
    text: "Enterprise and commercial use of Knoledgr by customer organizations, their administrators, and their authorized users.",
  },
  {
    title: "How the documents fit",
    text: "Signed order forms, enterprise addenda, the DPA, and the Security Annex can supplement these terms and control where they conflict.",
  },
  {
    title: "Main responsibilities",
    text: "Access control, acceptable use, customer data handling, subscriptions, confidentiality, security cooperation, suspension, and termination.",
  },
];

const sections = [
  {
    id: "scope",
    title: "1. Scope and order of documents",
    paragraphs: [
      "These Terms of Service govern commercial and enterprise access to Knoledgr by a customer organization and the users that organization authorizes to use the service.",
      "If the customer and Knoledgr sign an order form, DPA, security exhibit, support exhibit, or other negotiated addendum, those documents supplement these terms. In the event of conflict, the signed order form or negotiated exhibit generally controls over these public terms for the specific customer relationship.",
    ],
  },
  {
    id: "accounts",
    title: "2. Accounts, administrators, and authorized users",
    bullets: [
      "Customer administrators are responsible for inviting users, assigning roles, managing workspace settings, and controlling access within the customer organization.",
      "The customer is responsible for activity that occurs through its managed accounts except to the extent caused by Knoledgr's own breach of these terms or applicable law.",
      "Users must keep account credentials reasonably secure and use Knoledgr only through authorized workflows and interfaces.",
    ],
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable use and restrictions",
    bullets: [
      "Customers and users may not use Knoledgr to violate law, infringe rights, interfere with service operations, or attempt unauthorized access to the platform, customer environments, or third-party systems.",
      "Customers may not knowingly upload malicious code, abuse automation in a way that degrades service quality, or use the service to store or transmit unlawful content.",
      "Unless explicitly allowed by contract or law, customers may not resell the service, reverse engineer protected non-public service components, or use the service to build a competing hosted offering from non-public functionality.",
    ],
  },
  {
    id: "customer-data",
    title: "4. Customer data, instructions, and workspace content",
    paragraphs: [
      "As between the parties, the customer retains rights in customer data submitted to the service. The customer is responsible for the accuracy, legality, and appropriateness of the content it and its users place into Knoledgr.",
      "Knoledgr processes customer data to provide and secure the service, follow documented customer instructions, support configured features, and meet contractual or legal obligations. Additional processing details may appear in the Privacy Notice, DPA, Security Annex, or customer-specific documentation.",
    ],
    bullets: [
      "Workspace content may include conversations, decisions, documents, tasks, meetings, projects, issues, comments, files, AI prompts, and connected integration data.",
      "Customers should avoid placing data into the service that they are not authorized to disclose or that is prohibited by their own policies, contracts, or law.",
    ],
  },
  {
    id: "service-rights",
    title: "5. Service rights and Knoledgr intellectual property",
    paragraphs: [
      "Subject to these terms and the customer's subscription, Knoledgr grants the customer a limited, non-exclusive, non-transferable right for its authorized users to access and use the service during the applicable subscription term.",
      "Knoledgr retains rights in the service, software, documentation, design systems, models, analytics, and other materials it provides, except for customer data and customer-owned content.",
    ],
  },
  {
    id: "subscriptions",
    title: "6. Subscription terms, billing, and plan limits",
    bullets: [
      "Commercial terms such as plan type, subscription period, seat limits, billing cadence, invoicing, and payment terms are governed by the applicable checkout flow, subscription settings, or order form.",
      "Some features or usage levels may depend on the customer's plan tier, purchased limits, add-ons, or enterprise agreement.",
      "If payment is overdue or contracted usage materially exceeds agreed limits, Knoledgr may work with the customer to cure the issue and may restrict access or features where contract terms allow.",
    ],
  },
  {
    id: "integrations",
    title: "7. Third-party services, integrations, and beta features",
    bullets: [
      "Knoledgr may support integrations with third-party systems selected by the customer. The customer is responsible for its own relationship with those third parties and for configuring access appropriately.",
      "Third-party products and services are subject to the third party's own terms, privacy notices, and availability commitments.",
      "Knoledgr may offer beta, preview, or early-access features. Those features may change, may have limited support, and may be governed by additional terms or notices.",
    ],
  },
  {
    id: "security-confidentiality",
    title: "8. Security, confidentiality, and incident cooperation",
    paragraphs: [
      "Knoledgr maintains security and confidentiality obligations appropriate to the service relationship and described further in the Security Annex and any customer-specific security exhibits.",
      "Each party will protect the other party's confidential information with at least reasonable care and will use that information only to perform or exercise rights under the applicable agreement, except where disclosure is required by law.",
    ],
    bullets: [
      "Knoledgr will provide incident communication consistent with the Security Annex and any customer-specific contractual commitments.",
      "Customers are responsible for managing their own internal policies, role assignments, connected integrations, and end-user behavior inside the workspace.",
    ],
  },
  {
    id: "support-changes",
    title: "9. Support, product changes, and service evolution",
    bullets: [
      "Support channels, response expectations, service levels, and any service credits are defined by the customer's plan, order form, support exhibit, or published support commitments where applicable.",
      "Knoledgr may improve, update, or modify the service over time. If a change materially reduces core contracted functionality for enterprise customers, Knoledgr will seek to provide commercially reasonable notice where appropriate.",
    ],
  },
  {
    id: "suspension-termination",
    title: "10. Suspension, termination, and exit",
    bullets: [
      "Knoledgr may suspend access where reasonably necessary to address security risk, unlawful use, threats to service integrity, or material breach, particularly where immediate action is needed.",
      "Either party may terminate the service relationship as provided in the applicable order form, subscription terms, or enterprise agreement.",
      "Following termination or expiration, customer access, export rights, retention periods, and deletion obligations are governed by the applicable contract, plan terms, and documented offboarding workflows.",
    ],
  },
  {
    id: "warranties-liability",
    title: "11. Warranties, disclaimers, and liability structure",
    paragraphs: [
      "Any service warranties, performance commitments, indemnities, liability caps, exclusions, and negotiated remedies are governed by the customer's subscription terms, order form, or enterprise agreement.",
      "Except to the extent otherwise stated in a binding agreement or required by law, the service is provided on an as-available and as-evolving basis, especially for non-production, beta, experimental, or AI-assisted features whose outputs depend on underlying data quality and user configuration.",
    ],
  },
  {
    id: "compliance",
    title: "12. Export controls, sanctions, and legal compliance",
    bullets: [
      "Customers and users are responsible for using the service in compliance with applicable law, including laws related to privacy, employment, intellectual property, export controls, sanctions, and records handling.",
      "Customers may not use Knoledgr in violation of applicable trade restrictions or for prohibited end uses.",
    ],
  },
  {
    id: "notices",
    title: "13. Changes, notices, and contact",
    paragraphs: [
      "Knoledgr may update these public terms from time to time to reflect product changes, legal developments, or operational changes. The effective date above indicates the latest public version.",
      "Customers with negotiated agreements should continue to rely on their signed documents for customer-specific commitments. Legal and contractual questions can be directed to Knoledgr's legal contact.",
    ],
    bullets: [
      "Legal and contract questions: legal@knoledgr.com",
      "Security review coordination: security@knoledgr.com",
      "Privacy requests: privacy@knoledgr.com",
    ],
  },
];

export default function TermsEnterprise() {
  return (
    <PublicPolicyPage
      eyebrow="Legal"
      title="Knoledgr Enterprise Terms of Service"
      lead="These terms describe how enterprise and commercial customers use Knoledgr, how customer data and access are handled, and how billing, security, confidentiality, suspension, and termination fit together in the service relationship."
      effectiveDate={effectiveDate}
      updatedDate={effectiveDate}
      contactLabel="Legal Contact"
      contactEmail="legal@knoledgr.com"
      summaryCards={summaryCards}
      sections={sections}
      footerLinks={[
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/security-annex", label: "Security Annex" },
        { href: "/partners", label: "Partners" },
      ]}
    />
  );
}
