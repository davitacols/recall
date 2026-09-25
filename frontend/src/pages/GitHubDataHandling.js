import React from "react";
import PublicPolicyPage from "../components/PublicPolicyPage";

const effectiveDate = "September 25, 2026";

const summaryCards = [
  {
    title: "Selected repositories only",
    text: "A GitHub administrator chooses which repositories the Knoledgr App may access. Workspace administrators then enable decision capture per repository.",
  },
  {
    title: "Pull-request context",
    text: "Knoledgr records PR metadata, descriptions, human review discussion, source links, and the names of files touched when needed for decision-to-code traceability.",
  },
  {
    title: "Customer-controlled exit",
    text: "Customers can disable a repository, disconnect the App, export workspace records, and request deletion of pilot data.",
  },
];

const sections = [
  {
    id: "scope",
    title: "1. Scope of this page",
    paragraphs: [
      "This page describes how the Knoledgr GitHub App handles information during a customer pilot and in the standard hosted product. It supplements the Privacy Notice, Terms of Service, and Security Annex.",
      "A pilot should begin with one repository chosen by the customer. Knoledgr does not require access to every repository in a GitHub organization.",
    ],
  },
  {
    id: "permissions",
    title: "2. GitHub permissions and customer control",
    bullets: [
      "Core capture uses GitHub installation metadata and pull-request read access. It does not require a founder's or employee's personal access token.",
      "Optional features that write a contextual comment back to a pull request require pull-request write access. Those features remain inactive when that permission has not been granted.",
      "The GitHub administrator controls the App's repository selection in GitHub. A Knoledgr workspace administrator separately enables or disables decision capture for each visible repository.",
      "Removing a repository from the GitHub App or disabling it in Knoledgr stops future capture for that repository. Previously captured records remain until they are deleted under the customer's instructions.",
    ],
  },
  {
    id: "read",
    title: "3. Information Knoledgr reads",
    bullets: [
      "Installation and repository metadata, including GitHub account, repository name, visibility, default branch, and installation status.",
      "Pull-request metadata, including number, title, description, author, branches, state, timestamps, and the GitHub URL.",
      "Human-authored review summaries, inline review comments, and top-level pull-request comments used to determine whether a substantive decision discussion occurred.",
      "The pull-request files endpoint is used to identify filenames touched by a decision. GitHub may return patch context in that API response, but Knoledgr's decision-file record stores the filename and attribution metadata rather than a copy of the repository file or full patch.",
      "Webhook event metadata needed to verify delivery, diagnose capture, and prevent duplicate processing.",
    ],
  },
  {
    id: "store",
    title: "4. Information Knoledgr stores",
    bullets: [
      "A captured conversation containing the relevant pull-request description and substantive human discussion, with participant names, timestamps, provenance, and a source link.",
      "Decision records created by workspace users, including the decision, rationale, alternatives, expected outcome, linked PR, and related filenames where available.",
      "Repository and installation metadata required to keep the connection working and show its health.",
      "A limited webhook delivery audit containing event type, action, delivery identifier, signature result, status, summary, and time. The GitHub App audit model does not retain the complete raw webhook payload.",
      "Workspace activity and security logs used for support, abuse investigation, and customer administration.",
    ],
  },
  {
    id: "ai",
    title: "5. AI processing",
    paragraphs: [
      "Knoledgr uses Anthropic models for AI-assisted extraction and Ask Recall. When those features process a record, the relevant workspace text and instructions needed for the request may be sent to Anthropic for processing.",
      "Knoledgr does not represent AI output as source evidence. Answers are designed to cite the underlying workspace records so a user can inspect the original decision or GitHub discussion.",
    ],
    bullets: [
      "Customers should not connect repositories containing data that their own policies prohibit from being processed by an external AI provider.",
      "AI processing can be reviewed as part of the pilot scope before a production rollout.",
      "Knoledgr does not claim that generated summaries or answers are always correct; users remain responsible for verifying important conclusions against cited evidence.",
    ],
  },
  {
    id: "security",
    title: "6. Security boundaries",
    bullets: [
      "GitHub webhook signatures are verified before events are processed.",
      "GitHub App installation tokens are short-lived and are created server-side. The App private key and webhook secret are not returned to workspace users.",
      "Authenticated product reads are scoped to the user's Knoledgr organization, and repository records are assigned to a single workspace at a time.",
      "The hosted service uses encrypted HTTPS connections over public networks and a single-region production deployment.",
      "Knoledgr does not currently offer SAML SSO, mandatory MFA, customer-selected data residency, SOC 2, or ISO 27001 certification. These gaps should be considered before a wider regulated deployment.",
    ],
  },
  {
    id: "providers",
    title: "7. Providers involved in the hosted service",
    paragraphs: [
      "The exact provider set depends on which product features are enabled. The hosted service may use the following core providers to deliver a pilot.",
    ],
    bullets: [
      "Hetzner for production compute and primary hosted infrastructure.",
      "Cloudflare for DNS, edge services, and off-site R2 backup storage.",
      "Anthropic for enabled AI processing.",
      "Resend for transactional email and operational alerts.",
      "Sentry for error monitoring when configured, Stripe for paid billing when used, and Google for Google sign-in when enabled.",
    ],
  },
  {
    id: "retention",
    title: "8. Retention, export, and deletion",
    bullets: [
      "Disconnecting the GitHub App stops the Knoledgr-side connection but does not silently delete decision history that the customer may need to export.",
      "Workspace administrators can export core workspace records. A pilot customer may also request a structured export before offboarding.",
      "After written deletion confirmation, Knoledgr can purge the pilot workspace from the live application. Backup copies may persist until the applicable backup-retention schedule expires and are not available through the normal product interface.",
      "Uninstalling the App in GitHub revokes the App's GitHub-side access. Customers should complete both the Knoledgr disconnect and GitHub uninstall steps when ending a pilot.",
      "Pilot-specific retention or deletion deadlines should be recorded in the pilot agreement before customer data is connected.",
    ],
  },
  {
    id: "pilot",
    title: "9. Recommended pilot boundary",
    bullets: [
      "One customer-selected repository for 30 days.",
      "A named customer administrator and a named Knoledgr support contact.",
      "An agreed historical-import limit before the import begins.",
      "No automatic expansion to additional repositories.",
      "A closing review covering export, continued use, or deletion.",
    ],
  },
  {
    id: "contact",
    title: "10. Questions and pilot requests",
    paragraphs: [
      "Security questionnaires, data-flow questions, deletion requests, and pilot-scope changes should be sent to the contacts below. Material customer commitments should be confirmed in writing rather than inferred from this public summary.",
    ],
    bullets: [
      "Security questions: security@knoledgr.com",
      "Privacy and deletion requests: privacy@knoledgr.com",
      "Pilot onboarding and support: support@knoledgr.com",
      "Contracts and procurement: legal@knoledgr.com",
    ],
  },
];

export default function GitHubDataHandling() {
  return (
    <PublicPolicyPage
      eyebrow="GitHub Pilot"
      title="GitHub Data Handling"
      lead="A concrete explanation of what the Knoledgr GitHub App can access, what it records, when AI processing is involved, and how a customer can leave."
      effectiveDate={effectiveDate}
      updatedDate={effectiveDate}
      contactLabel="Security Contact"
      contactEmail="security@knoledgr.com"
      summaryCards={summaryCards}
      sections={sections}
      footerLinks={[
        { href: "/security-annex", label: "Security Annex" },
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/terms", label: "Terms of Service" },
        { href: "mailto:support@knoledgr.com", label: "Request a pilot" },
      ]}
    />
  );
}
