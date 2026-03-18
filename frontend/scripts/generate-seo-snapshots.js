const fs = require("fs");
const path = require("path");

const SITE_URL = "https://knoledgr.com";
const BRAND = "Knoledgr";
const SOCIAL_IMAGE = `${SITE_URL}/brand/knoledgr-social-card.svg`;
const buildDir = path.join(__dirname, "..", "build");
const templatePath = path.join(buildDir, "index.html");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function upsertTag(html, regex, replacement) {
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function upsertMetaByName(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, "i");
  return upsertTag(html, pattern, tag);
}

function upsertMetaByProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta[^>]+property=["']${property}["'][^>]*>`, "i");
  return upsertTag(html, pattern, tag);
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  return upsertTag(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, tag);
}

function upsertStructuredData(html, payload) {
  const tag = `<script id="seo-structured-data" type="application/ld+json">${escapeJson(payload)}</script>`;
  return upsertTag(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/i,
    tag
  );
}

function upsertSnapshotStyles(html) {
  const styles = [
    "#root [data-seo-snapshot] {",
    "  font-family: 'Manrope', 'Segoe UI', sans-serif;",
    "  color: #172033;",
    "  background: linear-gradient(180deg, #f6f1e8 0%, #fcfbf8 100%);",
    "  min-height: 100vh;",
    "}",
    "#root [data-seo-snapshot] .snapshot-shell {",
    "  max-width: 1040px;",
    "  margin: 0 auto;",
    "  padding: 56px 20px 72px;",
    "}",
    "#root [data-seo-snapshot] .snapshot-nav {",
    "  display: flex;",
    "  flex-wrap: wrap;",
    "  gap: 12px 18px;",
    "  margin-bottom: 24px;",
    "  font-size: 14px;",
    "}",
    "#root [data-seo-snapshot] .snapshot-nav a,",
    "#root [data-seo-snapshot] .snapshot-footer a,",
    "#root [data-seo-snapshot] .snapshot-card a {",
    "  color: #1f4b99;",
    "  text-decoration: none;",
    "}",
    "#root [data-seo-snapshot] .snapshot-nav a:hover,",
    "#root [data-seo-snapshot] .snapshot-footer a:hover,",
    "#root [data-seo-snapshot] .snapshot-card a:hover {",
    "  text-decoration: underline;",
    "}",
    "#root [data-seo-snapshot] .snapshot-eyebrow {",
    "  margin: 0 0 12px;",
    "  font-size: 12px;",
    "  letter-spacing: 0.18em;",
    "  text-transform: uppercase;",
    "  color: #7a6244;",
    "}",
    "#root [data-seo-snapshot] h1 {",
    "  margin: 0 0 16px;",
    "  font-size: clamp(2.2rem, 5vw, 4rem);",
    "  line-height: 1.04;",
    "  font-family: 'Space Grotesk', 'Manrope', sans-serif;",
    "}",
    "#root [data-seo-snapshot] .snapshot-lead {",
    "  max-width: 760px;",
    "  margin: 0 0 20px;",
    "  font-size: 18px;",
    "  line-height: 1.7;",
    "  color: #465066;",
    "}",
    "#root [data-seo-snapshot] .snapshot-actions {",
    "  display: flex;",
    "  flex-wrap: wrap;",
    "  gap: 12px;",
    "  margin-bottom: 28px;",
    "}",
    "#root [data-seo-snapshot] .snapshot-button {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  min-height: 42px;",
    "  padding: 0 16px;",
    "  border-radius: 999px;",
    "  border: 1px solid #d8ceb7;",
    "  background: #ffffffcc;",
    "  color: #172033;",
    "  text-decoration: none;",
    "  font-weight: 600;",
    "}",
    "#root [data-seo-snapshot] .snapshot-button.snapshot-button-primary {",
    "  background: #172033;",
    "  color: #f8f4ec;",
    "  border-color: #172033;",
    "}",
    "#root [data-seo-snapshot] .snapshot-grid {",
    "  display: grid;",
    "  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));",
    "  gap: 16px;",
    "  margin: 24px 0;",
    "}",
    "#root [data-seo-snapshot] .snapshot-card {",
    "  border: 1px solid #e2d8c4;",
    "  background: rgba(255, 255, 255, 0.82);",
    "  border-radius: 22px;",
    "  padding: 22px;",
    "  box-shadow: 0 20px 50px rgba(23, 32, 51, 0.06);",
    "}",
    "#root [data-seo-snapshot] h2 {",
    "  margin: 0 0 12px;",
    "  font-size: 1.35rem;",
    "}",
    "#root [data-seo-snapshot] h3 {",
    "  margin: 0 0 10px;",
    "  font-size: 1.02rem;",
    "}",
    "#root [data-seo-snapshot] p {",
    "  margin: 0 0 14px;",
    "  line-height: 1.7;",
    "}",
    "#root [data-seo-snapshot] ul {",
    "  margin: 0;",
    "  padding-left: 18px;",
    "  color: #465066;",
    "  line-height: 1.7;",
    "}",
    "#root [data-seo-snapshot] li + li {",
    "  margin-top: 8px;",
    "}",
    "#root [data-seo-snapshot] .snapshot-footer {",
    "  display: flex;",
    "  flex-wrap: wrap;",
    "  gap: 12px 18px;",
    "  margin-top: 32px;",
    "  padding-top: 18px;",
    "  border-top: 1px solid #e2d8c4;",
    "  font-size: 14px;",
    "}",
    "#root [data-seo-snapshot] .snapshot-meta {",
    "  margin: 0 0 18px;",
    "  font-size: 14px;",
    "  color: #6a7487;",
    "}",
    "#root [data-seo-snapshot] .snapshot-notice {",
    "  border-left: 4px solid #172033;",
    "  padding-left: 14px;",
    "  color: #465066;",
    "}",
    "@media (max-width: 720px) {",
    "  #root [data-seo-snapshot] .snapshot-shell { padding: 36px 16px 52px; }",
    "  #root [data-seo-snapshot] .snapshot-grid { gap: 12px; }",
    "}",
  ].join("\n");

  const styleTag = `<style id="seo-snapshot-styles">\n${styles}\n    </style>`;
  return upsertTag(html, /<style[^>]+id=["']seo-snapshot-styles["'][^>]*>[\s\S]*?<\/style>/i, styleTag);
}

function injectSnapshotBody(html, bodyHtml) {
  return html.replace(
    /<div id="root">[\s\S]*?<\/div>/i,
    `<div id="root">\n${bodyHtml}\n    </div>`
  );
}

function renderLayout({ eyebrow, heading, lead, actions, sections, footerLinks, meta }) {
  const actionHtml = (actions || [])
    .map(
      (action) =>
        `<a class="snapshot-button${action.primary ? " snapshot-button-primary" : ""}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
    )
    .join("");

  const sectionsHtml = (sections || [])
    .map(
      (section) => `
      <section class="snapshot-card">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.copy ? `<p>${escapeHtml(section.copy)}</p>` : ""}
        ${
          section.bullets?.length
            ? `<ul>${section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
            : ""
        }
        ${section.link ? `<p><a href="${escapeHtml(section.link.href)}">${escapeHtml(section.link.label)}</a></p>` : ""}
      </section>`
    )
    .join("");

  const footerHtml = (footerLinks || [])
    .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
    .join("");

  return `      <main data-seo-snapshot="true">
        <div class="snapshot-shell">
          <nav class="snapshot-nav">
            <a href="/">Home</a>
            <a href="/docs">Documentation</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/security-annex">Security Annex</a>
            <a href="/login">Login</a>
          </nav>
          <p class="snapshot-eyebrow">${escapeHtml(eyebrow)}</p>
          <h1>${escapeHtml(heading)}</h1>
          ${meta ? `<p class="snapshot-meta">${escapeHtml(meta)}</p>` : ""}
          <p class="snapshot-lead">${escapeHtml(lead)}</p>
          ${actionHtml ? `<div class="snapshot-actions">${actionHtml}</div>` : ""}
          <div class="snapshot-grid">
${sectionsHtml}
          </div>
          ${footerHtml ? `<footer class="snapshot-footer">${footerHtml}</footer>` : ""}
        </div>
      </main>`;
}

const pageConfigs = [
  {
    route: "/",
    title: `${BRAND} | Decision Memory for Teams`,
    description:
      "Knoledgr helps teams capture decisions, documents, and conversations in one knowledge-first workspace that keeps context searchable and reusable.",
    ogType: "website",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: BRAND,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/knoledgr-app-icon.svg`,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: BRAND,
        url: SITE_URL,
        description: "Decision memory and knowledge-first collaboration for teams.",
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: BRAND,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "A knowledge-first collaboration platform for decisions, conversations, projects, and documents.",
      },
    ],
    body: renderLayout({
      eyebrow: "Knoledgr",
      heading: "Decision memory for teams",
      lead:
        "Knoledgr brings conversations, decisions, documents, and execution into one knowledge-first workspace so context stays searchable, linked, and reusable as work moves.",
      actions: [
        { href: "/login", label: "Open the app", primary: true },
        { href: "/docs", label: "Read documentation" },
      ],
      sections: [
        {
          title: "Capture the full decision trail",
          copy:
            "Turn discussion into decisions with rationale, alternatives, confidence, implementation notes, and outcome reviews in one place.",
          bullets: [
            "Link decisions directly to conversations and execution work.",
            "Keep review history, drift alerts, and lessons learned searchable.",
            "Use a shared operating layer instead of scattered notes and threads.",
          ],
        },
        {
          title: "Run execution with context attached",
          copy:
            "Projects, issues, sprints, and blockers inherit the decision context behind the work so teams understand why delivery changed.",
          bullets: [
            "Track sprint flow, blockers, and delivery signals together.",
            "Connect issues and projects to decisions, documents, and meetings.",
            "Reduce context loss across planning, implementation, and review.",
          ],
        },
        {
          title: "Build reusable institutional memory",
          copy:
            "A linked memory layer keeps high-signal work accessible across product, engineering, operations, and leadership teams.",
          bullets: [
            "Search across conversations, decisions, documents, and execution history.",
            "Surface related experts, artifacts, and outcome patterns.",
            "Keep knowledge alive after meetings, releases, and org changes.",
          ],
        },
      ],
      footerLinks: [
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/security-annex", label: "Security Annex" },
      ],
    }),
  },
  {
    route: "/docs",
    title: `Documentation | ${BRAND}`,
    description:
      "Explore Knoledgr documentation covering conversations, decisions, agile execution, knowledge graph workflows, and operational guidance.",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Documentation | ${BRAND}`,
        description:
          "Explore Knoledgr documentation covering conversations, decisions, agile execution, knowledge graph workflows, and operational guidance.",
        url: `${SITE_URL}/docs`,
        isPartOf: {
          "@type": "WebSite",
          name: BRAND,
          url: SITE_URL,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: `Documentation | ${BRAND}`,
        description:
          "Explore Knoledgr documentation covering conversations, decisions, agile execution, knowledge graph workflows, and operational guidance.",
        url: `${SITE_URL}/docs`,
        author: {
          "@type": "Organization",
          name: BRAND,
        },
        publisher: {
          "@type": "Organization",
          name: BRAND,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/brand/knoledgr-app-icon.svg`,
          },
        },
      },
    ],
    body: renderLayout({
      eyebrow: "Knoledgr Manual",
      heading: "Documentation",
      lead:
        "Browse the product foundation, execution workflows, knowledge systems, and reference material behind Knoledgr's decision-memory platform.",
      actions: [
        { href: "/docs", label: "Open interactive docs", primary: true },
        { href: "/", label: "Visit homepage" },
      ],
      sections: [
        {
          title: "Foundation",
          bullets: [
            "Platform overview for conversations, decisions, agile execution, business operations, and the shared memory layer.",
            "Architecture and data flow notes covering content links, unified activity, and context panels.",
          ],
        },
        {
          title: "Workflows",
          bullets: [
            "Conversation guidance for structured discovery and promotion into decisions.",
            "Decision lifecycle, outcome intelligence, and replay simulator references.",
          ],
        },
        {
          title: "Agile execution",
          bullets: [
            "Projects, issues, and sprints linked to decisions and knowledge graph context.",
            "Decision-coupled sprint autopilot coverage for delivery forecasting and scope moves.",
          ],
        },
        {
          title: "Knowledge and AI",
          bullets: [
            "Context engine payloads for related artifacts, experts, and risks.",
            "Recommendation ranking signals based on activity, links, recency, and validated outcomes.",
          ],
        },
        {
          title: "Operations and reference",
          bullets: [
            "Business module, roles, governance, app marketplace, and troubleshooting guidance.",
            "High-value API endpoints for decisions, agile workflows, enterprise operations, and realtime notifications.",
          ],
        },
      ],
      footerLinks: [
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/security-annex", label: "Security Annex" },
      ],
    }),
  },
  {
    route: "/privacy",
    title: `Privacy Notice | ${BRAND}`,
    description:
      "Read the Knoledgr enterprise privacy notice, including data categories, subprocessors, retention, and customer privacy support.",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Privacy Notice | ${BRAND}`,
        description:
          "Read the Knoledgr enterprise privacy notice, including data categories, subprocessors, retention, and customer privacy support.",
        url: `${SITE_URL}/privacy`,
        isPartOf: {
          "@type": "WebSite",
          name: BRAND,
          url: SITE_URL,
        },
      },
    ],
    body: renderLayout({
      eyebrow: "Legal",
      heading: "Knoledgr Enterprise Privacy Notice",
      meta: "Effective Date: March 4, 2026",
      lead:
        "This privacy notice explains how Knoledgr handles enterprise account data, customer content, support records, and operational metadata while supporting customer privacy obligations.",
      actions: [
        { href: "/privacy", label: "Open privacy page", primary: true },
        { href: "/security-annex", label: "Review security annex" },
      ],
      sections: [
        {
          title: "Scope and roles",
          bullets: [
            "Applies to Knoledgr enterprise services, support channels, APIs, and integrations.",
            "Knoledgr generally acts as processor or service provider for customer content and controller for account, billing, and security data.",
          ],
        },
        {
          title: "Data categories and purposes",
          bullets: [
            "Processes account identifiers, workspace metadata, user-generated content, logs, support records, integration metadata, and billing records.",
            "Uses that data to provide the service, secure the platform, support customers, deliver analytics and AI features, and satisfy legal obligations.",
          ],
        },
        {
          title: "Transfers, subprocessors, and retention",
          bullets: [
            "Enterprise customers may execute a DPA and SCCs where cross-border transfers require them.",
            "Subprocessors are used for hosting, email, monitoring, support, billing, and AI services under written confidentiality and security terms.",
            "Customer data is retained and deleted according to contract terms and offboarding procedures, subject to legal retention duties.",
          ],
        },
        {
          title: "Security and rights support",
          bullets: [
            "Security controls include encryption in transit, access controls, audit logging, least privilege, and vulnerability management.",
            "Knoledgr supports customers responding to access, deletion, correction, portability, restriction, and objection requests.",
          ],
        },
      ],
      footerLinks: [
        { href: "/terms", label: "Terms of Service" },
        { href: "/security-annex", label: "Security Annex" },
        { href: "mailto:privacy@knoledgr.com", label: "privacy@knoledgr.com" },
      ],
    }),
  },
  {
    route: "/terms",
    title: `Terms of Service | ${BRAND}`,
    description:
      "Review Knoledgr enterprise terms covering customer data, security obligations, support, confidentiality, and liability structure.",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Terms of Service | ${BRAND}`,
        description:
          "Review Knoledgr enterprise terms covering customer data, security obligations, support, confidentiality, and liability structure.",
        url: `${SITE_URL}/terms`,
        isPartOf: {
          "@type": "WebSite",
          name: BRAND,
          url: SITE_URL,
        },
      },
    ],
    body: renderLayout({
      eyebrow: "Legal",
      heading: "Knoledgr Enterprise Terms of Service",
      meta: "Effective Date: March 4, 2026",
      lead:
        "These terms outline how enterprise customers use Knoledgr, how customer data is handled, and how security, confidentiality, support, and liability are governed in the enterprise relationship.",
      actions: [
        { href: "/terms", label: "Open terms page", primary: true },
        { href: "/privacy", label: "View privacy notice" },
      ],
      sections: [
        {
          title: "Agreement structure",
          bullets: [
            "Applies to enterprise use by customer organizations and authorized users.",
            "Order of precedence is signed Order Form, executed DPA, Security Annex, then the enterprise terms.",
          ],
        },
        {
          title: "Customer data and transfers",
          bullets: [
            "Customers retain rights in customer data, and Knoledgr processes it only as needed to provide the service and follow documented customer instructions.",
            "The DPA forms part of the enterprise contract, with SCCs and supporting safeguards used where cross-border transfers require them.",
          ],
        },
        {
          title: "Security, support, and incident response",
          bullets: [
            "Security obligations are detailed in the Security Annex, including access management, encryption, incident response, vulnerability management, and logging.",
            "Service levels, support expectations, and service credits are defined in customer-specific order forms or enterprise exhibits.",
            "Customers are notified without undue delay after confirmation of a security incident affecting customer data.",
          ],
        },
        {
          title: "Confidentiality and liability",
          bullets: [
            "Each party protects confidential information with at least reasonable care and uses it only for contract performance.",
            "Liability caps, exclusions, indemnities, and audit rights are governed by the signed enterprise agreement.",
          ],
        },
      ],
      footerLinks: [
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/security-annex", label: "Security Annex" },
        { href: "mailto:legal@knoledgr.com", label: "legal@knoledgr.com" },
      ],
    }),
  },
  {
    route: "/security-annex",
    title: `Security Annex | ${BRAND}`,
    description:
      "Review the Knoledgr security annex covering access controls, encryption, logging, incident response, resilience, and governance.",
    ogType: "article",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `Security Annex | ${BRAND}`,
        description:
          "Review the Knoledgr security annex covering access controls, encryption, logging, incident response, resilience, and governance.",
        url: `${SITE_URL}/security-annex`,
        isPartOf: {
          "@type": "WebSite",
          name: BRAND,
          url: SITE_URL,
        },
      },
    ],
    body: renderLayout({
      eyebrow: "Security",
      heading: "Knoledgr Security Annex",
      meta: "Effective Date: March 18, 2026",
      lead:
        "The security annex summarizes the technical and organizational controls Knoledgr uses to support tenant isolation, secure product delivery, operational resilience, and enterprise assurance.",
      actions: [
        { href: "/security-annex", label: "Open security annex", primary: true },
        { href: "/terms", label: "View terms" },
      ],
      sections: [
        {
          title: "Core security controls",
          bullets: [
            "Role-based and least-privilege access management for production systems and administrative actions.",
            "TLS for data in transit, secure storage practices, protected credentials, and restricted access to sensitive components.",
            "Audit logging, monitoring, and alerting for troubleshooting, access review, and abnormal behavior detection.",
          ],
        },
        {
          title: "Isolation and remediation",
          bullets: [
            "Organization-scoped product and backend workflows are designed to keep customer data isolated.",
            "Vulnerability management prioritizes severity, exposure, and customer impact, with accelerated handling for high-risk issues.",
          ],
        },
        {
          title: "Incident response and resilience",
          bullets: [
            "Incident procedures cover triage, containment, remediation, and customer communication.",
            "Continuity is supported through operational monitoring, controlled deployment workflows, and infrastructure practices that reduce service interruption risk.",
          ],
        },
        {
          title: "Vendor controls and contact",
          bullets: [
            "Third-party providers used for infrastructure, monitoring, communication, or related services are reviewed against contractual and security expectations.",
            "Enterprise security and assurance requests can be sent to the Knoledgr security team.",
          ],
        },
      ],
      footerLinks: [
        { href: "/privacy", label: "Privacy Notice" },
        { href: "/terms", label: "Terms of Service" },
        { href: "mailto:security@knoledgr.com", label: "security@knoledgr.com" },
      ],
    }),
  },
];

const redirectConfigs = [
  {
    route: "/home",
    target: "/",
    title: `${BRAND} | Decision Memory for Teams`,
    description:
      "Knoledgr helps teams capture decisions, documents, and conversations in one knowledge-first workspace that keeps context searchable and reusable.",
  },
];

function buildPageHtml(template, config) {
  const canonicalUrl = `${SITE_URL}${config.route}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(config.title)}</title>`);
  html = upsertMetaByName(html, "description", config.description);
  html = upsertMetaByName(html, "robots", "index,follow");
  html = upsertMetaByName(html, "googlebot", "index,follow");
  html = upsertMetaByProperty(html, "og:type", config.ogType);
  html = upsertMetaByProperty(html, "og:site_name", BRAND);
  html = upsertMetaByProperty(html, "og:title", config.title);
  html = upsertMetaByProperty(html, "og:description", config.description);
  html = upsertMetaByProperty(html, "og:url", canonicalUrl);
  html = upsertMetaByProperty(html, "og:image", SOCIAL_IMAGE);
  html = upsertMetaByProperty(html, "og:image:alt", `${BRAND} social card`);
  html = upsertMetaByName(html, "twitter:card", "summary_large_image");
  html = upsertMetaByName(html, "twitter:title", config.title);
  html = upsertMetaByName(html, "twitter:description", config.description);
  html = upsertMetaByName(html, "twitter:image", SOCIAL_IMAGE);
  html = upsertMetaByName(html, "twitter:image:alt", `${BRAND} social card`);
  html = upsertCanonical(html, canonicalUrl);
  html = upsertStructuredData(html, config.structuredData);
  html = upsertSnapshotStyles(html);
  html = injectSnapshotBody(html, config.body);

  return html;
}

function buildRedirectHtml(template, config) {
  const canonicalUrl = `${SITE_URL}${config.target}`;
  const redirectBody = `      <main data-seo-snapshot="true">
        <div class="snapshot-shell">
          <p class="snapshot-eyebrow">Redirecting</p>
          <h1>${escapeHtml(BRAND)} homepage moved here</h1>
          <p class="snapshot-lead">This page now lives at <a href="${escapeHtml(config.target)}">${escapeHtml(canonicalUrl)}</a>. If you are not redirected automatically, use the link below.</p>
          <div class="snapshot-actions">
            <a class="snapshot-button snapshot-button-primary" href="${escapeHtml(config.target)}">Go to homepage</a>
          </div>
        </div>
      </main>`;

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(config.title)}</title>`);
  html = upsertMetaByName(html, "description", config.description);
  html = upsertMetaByName(html, "robots", "noindex,follow");
  html = upsertMetaByName(html, "googlebot", "noindex,follow");
  html = upsertCanonical(html, canonicalUrl);
  html = upsertTag(
    html,
    /<meta[^>]+http-equiv=["']refresh["'][^>]*>/i,
    `<meta http-equiv="refresh" content="0; url=${escapeHtml(config.target)}" />`
  );
  html = upsertStructuredData(html, []);
  html = upsertSnapshotStyles(html);
  html = injectSnapshotBody(html, redirectBody);
  return html;
}

function writeRouteFile(route, html) {
  const routeDir = route === "/" ? buildDir : path.join(buildDir, route.replace(/^\/+/, ""));
  fs.mkdirSync(routeDir, { recursive: true });
  const outputPath = route === "/" ? templatePath : path.join(routeDir, "index.html");
  fs.writeFileSync(outputPath, html, "utf8");
}

function main() {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing build template at ${templatePath}`);
  }

  const template = fs.readFileSync(templatePath, "utf8");

  pageConfigs.forEach((config) => {
    writeRouteFile(config.route, buildPageHtml(template, config));
  });

  redirectConfigs.forEach((config) => {
    writeRouteFile(config.route, buildRedirectHtml(template, config));
  });

  console.log(`Generated SEO snapshots for ${pageConfigs.length + redirectConfigs.length} routes.`);
}

main();
