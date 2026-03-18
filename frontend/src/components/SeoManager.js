import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "Knoledgr";
const SITE_URL = "https://knoledgr.com";
const DEFAULT_IMAGE = `${SITE_URL}/brand/knoledgr-social-card.svg`;
const DEFAULT_DESCRIPTION =
  "Knoledgr connects conversations, decisions, projects, and documents so teams keep context and move faster.";

function webPageSchema(title, description, pathname) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${pathname}`,
    isPartOf: {
      "@type": "WebSite",
      name: BRAND,
      url: SITE_URL,
    },
  };
}

function resolveMeta(pathname) {
  if (pathname === "/" || pathname === "/home") {
    return {
      title: `${BRAND} | Decision Memory for Teams`,
      description:
        "Knoledgr helps teams capture decisions, documents, and conversations in one knowledge-first workspace that keeps context searchable and reusable.",
      robots: "index,follow",
      canonicalPath: "/",
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
          description:
            "Decision memory and knowledge-first collaboration for teams.",
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
    };
  }

  if (pathname === "/docs") {
    const title = `Documentation | ${BRAND}`;
    const description =
      "Explore Knoledgr documentation covering conversations, decisions, agile execution, knowledge graph workflows, and operational guidance.";
    return {
      title,
      description,
      robots: "index,follow",
      canonicalPath: "/docs",
      ogType: "article",
      structuredData: [
        webPageSchema(title, description, "/docs"),
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: title,
          description,
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
    };
  }

  if (pathname === "/privacy") {
    const title = `Privacy Notice | ${BRAND}`;
    const description =
      "Read the Knoledgr enterprise privacy notice, including data categories, subprocessors, retention, and customer privacy support.";
    return {
      title,
      description,
      robots: "index,follow",
      canonicalPath: "/privacy",
      ogType: "article",
      structuredData: [webPageSchema(title, description, "/privacy")],
    };
  }

  if (pathname === "/terms") {
    const title = `Terms of Service | ${BRAND}`;
    const description =
      "Review Knoledgr enterprise terms covering customer data, security obligations, support, confidentiality, and liability structure.";
    return {
      title,
      description,
      robots: "index,follow",
      canonicalPath: "/terms",
      ogType: "article",
      structuredData: [webPageSchema(title, description, "/terms")],
    };
  }

  if (pathname === "/security-annex") {
    const title = `Security Annex | ${BRAND}`;
    const description =
      "Review the Knoledgr security annex covering access controls, encryption, logging, incident response, resilience, and governance.";
    return {
      title,
      description,
      robots: "index,follow",
      canonicalPath: "/security-annex",
      ogType: "article",
      structuredData: [webPageSchema(title, description, "/security-annex")],
    };
  }

  if (pathname.startsWith("/login")) {
    return {
      title: `Login | ${BRAND}`,
      description: `Sign in to ${BRAND} and continue your team's knowledge workflows.`,
      robots: "noindex,nofollow",
      canonicalPath: "/login",
      ogType: "website",
      structuredData: [],
    };
  }

  if (pathname.startsWith("/forgot-password")) {
    return {
      title: `Forgot Password | ${BRAND}`,
      description: `Request a password reset link for your ${BRAND} account.`,
      robots: "noindex,nofollow",
      canonicalPath: "/forgot-password",
      ogType: "website",
      structuredData: [],
    };
  }

  if (pathname.startsWith("/reset-password")) {
    return {
      title: `Reset Password | ${BRAND}`,
      description: `Set a new password for your ${BRAND} account.`,
      robots: "noindex,nofollow",
      canonicalPath: "/forgot-password",
      ogType: "website",
      structuredData: [],
    };
  }

  if (pathname.startsWith("/invite/")) {
    return {
      title: `Workspace Invitation | ${BRAND}`,
      description: `Accept your ${BRAND} workspace invitation.`,
      robots: "noindex,nofollow",
      canonicalPath: "/login",
      ogType: "website",
      structuredData: [],
    };
  }

  return {
    title: `${BRAND} App`,
    description: DEFAULT_DESCRIPTION,
    robots: "noindex,nofollow",
    canonicalPath: pathname,
    ogType: "website",
    structuredData: [],
  };
}

function setOrCreateMeta(selector, attrs) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
}

function setOrCreateLink(selector, attrs) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
}

function setStructuredData(payload) {
  const scriptId = "seo-structured-data";
  let node = document.head.querySelector(`#${scriptId}`);

  if (!payload?.length) {
    if (node) node.remove();
    return;
  }

  if (!node) {
    node = document.createElement("script");
    node.id = scriptId;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }

  node.textContent = JSON.stringify(payload);
}

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveMeta(pathname);
    const canonicalUrl = `${SITE_URL}${meta.canonicalPath}`;

    document.title = meta.title;
    setOrCreateMeta('meta[name="description"]', { name: "description", content: meta.description });
    setOrCreateMeta('meta[name="robots"]', { name: "robots", content: meta.robots });
    setOrCreateMeta('meta[name="googlebot"]', { name: "googlebot", content: meta.robots });
    setOrCreateMeta('meta[property="og:type"]', { property: "og:type", content: meta.ogType });
    setOrCreateMeta('meta[property="og:site_name"]', { property: "og:site_name", content: BRAND });
    setOrCreateMeta('meta[property="og:title"]', { property: "og:title", content: meta.title });
    setOrCreateMeta('meta[property="og:description"]', { property: "og:description", content: meta.description });
    setOrCreateMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    setOrCreateMeta('meta[property="og:image"]', { property: "og:image", content: DEFAULT_IMAGE });
    setOrCreateMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: `${BRAND} social card` });
    setOrCreateMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setOrCreateMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title });
    setOrCreateMeta('meta[name="twitter:description"]', { name: "twitter:description", content: meta.description });
    setOrCreateMeta('meta[name="twitter:image"]', { name: "twitter:image", content: DEFAULT_IMAGE });
    setOrCreateMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: `${BRAND} social card` });
    setOrCreateLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
    setStructuredData(meta.structuredData);
  }, [pathname]);

  return null;
}
