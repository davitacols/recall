import React from "react";
import PublicPolicyPage from "../components/PublicPolicyPage";

const effectiveDate = "March 22, 2026";

const summaryCards = [
  {
    title: "What this covers",
    text: "Knoledgr's website, application, documentation, APIs, support, feedback and partner forms, and enterprise integrations.",
  },
  {
    title: "Primary roles",
    text: "Knoledgr generally acts as a processor or service provider for customer workspace content and as a controller for account, billing, security, and commercial data.",
  },
  {
    title: "Main topics",
    text: "Data categories, sources, uses, disclosures, transfers, retention, AI processing, security, and privacy rights handling.",
  },
];

const sections = [
  {
    id: "scope",
    title: "1. Scope and privacy roles",
    paragraphs: [
      "This Privacy Notice explains how Knoledgr handles personal data across the Knoledgr website, product interfaces, documentation, APIs, support channels, partner and feedback forms, and enterprise integrations.",
      "For workspace content and other data submitted by a customer organization and its users into Knoledgr, the customer organization generally decides the purposes of processing. In that context, Knoledgr typically acts as a processor or service provider on the customer's behalf.",
      "For account administration, authentication, billing, security operations, abuse prevention, support communications, and commercial relationship management, Knoledgr generally acts as a controller or business. If a signed order form, DPA, or other enterprise agreement applies, that agreement can supplement this notice.",
    ],
  },
  {
    id: "categories",
    title: "2. Categories of personal data Knoledgr may collect",
    bullets: [
      "Account and profile data, such as name, email address, username, role, organization, avatar, and workspace preferences.",
      "Workspace and customer content, such as conversations, decisions, documents, comments, tasks, meetings, issues, linked records, and file attachments entered by users.",
      "Usage, device, and audit data, such as authentication events, access logs, IP-derived session details, browser and device information, product interactions, and administrative audit trails.",
      "Support, feedback, and commercial data, such as requests sent to support, privacy, or legal channels, partner inquiries, feedback submissions, and onboarding communications.",
      "Integration and synchronization metadata, such as repository references, webhook events, connected account identifiers, and external system linkage records.",
      "Billing and subscription data, such as plan level, invoices, transaction references, seat usage, and payment-processor metadata. Knoledgr does not need to store full payment card numbers to manage subscriptions.",
      "AI interaction data, such as prompts, retrieved workspace context, system traces, and user feedback tied to AI-assisted features requested by the customer.",
    ],
  },
  {
    id: "sources",
    title: "3. Sources of personal data",
    bullets: [
      "Directly from customers, users, administrators, or buyers when they create accounts, configure workspaces, contact Knoledgr, submit forms, or use the service.",
      "From customer-provided integrations and connected systems when users authorize synchronization or linking.",
      "From service providers that support hosting, authentication, communications, monitoring, billing, analytics, storage, or AI functionality.",
      "From organizational administrators when they invite users, configure roles, set policies, or administer a workspace.",
    ],
  },
  {
    id: "purposes",
    title: "4. How Knoledgr uses personal data",
    bullets: [
      "Provide, maintain, and improve the Knoledgr service, including workspace setup, navigation, search, documentation, collaboration, and execution workflows.",
      "Authenticate users, enforce role-based permissions, isolate organization data, and keep service operations secure.",
      "Process customer instructions, including storing content, linking records, powering search, generating analytics, and operating AI-assisted features that customers choose to use.",
      "Respond to support requests, troubleshoot bugs, communicate product and security notices, and manage customer relationships.",
      "Measure reliability, investigate abuse or suspicious behavior, maintain logs, and satisfy legal, regulatory, contractual, or compliance obligations.",
      "Review feedback, partner inquiries, and commercial interest submissions to improve the product and operate Knoledgr's business.",
    ],
  },
  {
    id: "legal-bases",
    title: "5. Legal bases for processing",
    paragraphs: [
      "Where laws such as the GDPR or UK GDPR apply, Knoledgr generally relies on one or more of the following legal bases, depending on context: performance of a contract, legitimate interests, compliance with legal obligations, and consent where consent is required.",
      "Legitimate interests may include securing the platform, preventing abuse, keeping records of product activity, responding to customer inquiries, and improving product quality. Where Knoledgr relies on legitimate interests, it seeks to balance those interests against the rights and expectations of affected individuals.",
    ],
  },
  {
    id: "disclosures",
    title: "6. When Knoledgr discloses personal data",
    bullets: [
      "To subprocessors and service providers that support infrastructure, storage, communications, security monitoring, billing, analytics, and related operations under appropriate contractual terms.",
      "To AI or model providers when customers use AI-assisted features and the feature requires provider-side processing.",
      "To a customer's own administrators and authorized users according to workspace roles, permissions, and sharing settings chosen by the customer.",
      "To professional advisers, auditors, insurers, or financing counterparties where reasonably necessary for business operations and confidentiality duties apply.",
      "To law enforcement, regulators, courts, or other third parties when Knoledgr reasonably believes disclosure is required by law, to protect rights or safety, or to investigate misuse of the service.",
      "In connection with a merger, acquisition, financing, reorganization, or sale of assets, subject to appropriate safeguards and notice where required.",
    ],
  },
  {
    id: "transfers",
    title: "7. International transfers",
    paragraphs: [
      "Knoledgr may process data in countries other than the country where a customer or user is located. Where applicable law requires transfer safeguards, Knoledgr may offer contractual protections such as a Data Processing Addendum and Standard Contractual Clauses, together with supplementary measures that are appropriate for the service configuration.",
      "Customers with specific residency or transfer requirements should address those requirements in their enterprise agreement, DPA, or security review process.",
    ],
  },
  {
    id: "retention",
    title: "8. Retention and deletion",
    bullets: [
      "Customer workspace content is generally retained according to customer instructions, plan configuration, contractual commitments, and documented deletion or offboarding workflows.",
      "Account, billing, support, security, and audit records may be retained for longer periods where reasonably necessary to maintain service integrity, investigate incidents, prevent abuse, resolve disputes, or comply with law.",
      "Backups and system copies may persist for a limited period after live data is deleted before they are overwritten through normal retention cycles.",
      "When a customer relationship ends, Knoledgr seeks to follow the return, export, deletion, or retention terms stated in the applicable contract.",
    ],
  },
  {
    id: "security",
    title: "9. Security and incident handling",
    paragraphs: [
      "Knoledgr uses administrative, technical, and organizational safeguards designed to protect personal data. Depending on the service component, those safeguards may include encryption in transit, access controls, least-privilege administration, audit logging, environment separation, vulnerability management, and incident response procedures.",
      "No system can guarantee absolute security. Additional information about security controls, operational safeguards, and incident processes is available in the Knoledgr Security Annex.",
    ],
  },
  {
    id: "ai",
    title: "10. AI features and model processing",
    bullets: [
      "When customers enable or use AI features, Knoledgr may process prompts, retrieved workspace context, and related metadata to generate answers, summaries, recommendations, or other requested outputs.",
      "AI results are only as reliable as the underlying workspace data, retrieval quality, configured provider behavior, and customer usage patterns.",
      "Customers should evaluate whether highly sensitive personal data is appropriate for AI-assisted workflows under their own policies and contract requirements.",
      "Additional AI-specific commitments, provider restrictions, or data handling terms may appear in customer agreements, product settings, or enterprise documentation.",
    ],
  },
  {
    id: "rights",
    title: "11. Privacy rights and request handling",
    paragraphs: [
      "Depending on applicable law and Knoledgr's role, individuals may have rights that include access, correction, deletion, portability, restriction, objection, withdrawal of consent, and appeal. Some US state laws may also provide rights related to opt-out requests or limits on certain processing.",
      "Because customer organizations generally control customer workspace content, Knoledgr may direct some requests to the relevant customer administrator. Knoledgr may also ask for information necessary to verify identity, authority, and the scope of the request before responding.",
    ],
    bullets: [
      "Privacy requests: privacy@knoledgr.com",
      "General support questions: support@knoledgr.com",
      "Contractual or legal requests: legal@knoledgr.com",
    ],
  },
  {
    id: "children",
    title: "12. Children's privacy",
    paragraphs: [
      "Knoledgr is designed for business and professional use and is not directed to children. If Knoledgr learns that personal data was collected from a child in a way that requires consent not properly obtained, Knoledgr may take steps to delete or restrict that data as appropriate.",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to this notice",
    paragraphs: [
      "Knoledgr may update this notice from time to time to reflect product changes, legal developments, security practices, or operational changes. If Knoledgr makes a material update, it may revise the date above and, where appropriate, provide additional notice through the product, by email, or through contractual channels.",
    ],
  },
];

export default function PrivacyEnterprise() {
  return (
    <PublicPolicyPage
      eyebrow="Legal"
      title="Knoledgr Privacy Notice"
      lead="This notice is a fuller explanation of how Knoledgr handles personal data across the product, website, support channels, and enterprise operations. It is designed to help customers, administrators, users, and reviewers understand what data Knoledgr handles and why."
      effectiveDate={effectiveDate}
      updatedDate={effectiveDate}
      contactLabel="Privacy Contact"
      contactEmail="privacy@knoledgr.com"
      summaryCards={summaryCards}
      sections={sections}
      footerLinks={[
        { href: "/terms", label: "Terms of Service" },
        { href: "/security-annex", label: "Security Annex" },
        { href: "/feedback", label: "Feedback" },
      ]}
    />
  );
}
