import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "Knoledgr";
const DEFAULT_TITLE = `${BRAND} | Knowledge-First Collaboration Platform`;
const DEFAULT_DESCRIPTION =
  "Knoledgr connects conversations, decisions, projects, and documents so teams keep context and move faster.";
const DEFAULT_IMAGE = "/logo.png";

function resolveMeta(pathname) {
  if (pathname === "/" || pathname === "/home") {
    return {
      title: `${BRAND} | Team Memory and Decision Intelligence`,
      description:
        "Turn conversations, decisions, and project knowledge into a reliable system your team can use every day.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/login")) {
    return {
      title: `Login | ${BRAND}`,
      description: `Sign in to ${BRAND} and continue your team's knowledge workflows.`,
      robots: "noindex,nofollow",
    };
  }
  if (pathname.startsWith("/invite/")) {
    return {
      title: `Invitation | ${BRAND}`,
      description: `Accept your ${BRAND} workspace invitation.`,
      robots: "noindex,nofollow",
    };
  }
  if (pathname.startsWith("/conversations")) {
    return {
      title: `Conversations | ${BRAND}`,
      description: "Track discussions, preserve context, and connect conversations to outcomes.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/decisions")) {
    return {
      title: `Decisions | ${BRAND}`,
      description: "Document, review, and reference decisions with full context and ownership.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/projects")) {
    return {
      title: `Projects | ${BRAND}`,
      description: "Manage projects, issues, sprints, and delivery in a unified workspace.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/knowledge")) {
    return {
      title: `Knowledge | ${BRAND}`,
      description: "Search and analyze your team knowledge graph across docs, conversations, and decisions.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/business/")) {
    return {
      title: `Business Workspace | ${BRAND}`,
      description: "Run goals, meetings, tasks, and documents with shared context.",
      robots: "index,follow",
    };
  }
  if (pathname.startsWith("/notifications")) {
    return {
      title: `Notifications | ${BRAND}`,
      description: "Stay updated on decisions, mentions, tasks, and team activity.",
      robots: "noindex,nofollow",
    };
  }
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    robots: "index,follow",
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

export default function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname}`;
    const { title, description, robots } = resolveMeta(pathname);

    document.title = title;
    setOrCreateMeta('meta[name="description"]', { name: "description", content: description });
    setOrCreateMeta('meta[name="robots"]', { name: "robots", content: robots });

    setOrCreateMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    setOrCreateMeta('meta[property="og:site_name"]', { property: "og:site_name", content: BRAND });
    setOrCreateMeta('meta[property="og:title"]', { property: "og:title", content: title });
    setOrCreateMeta('meta[property="og:description"]', { property: "og:description", content: description });
    setOrCreateMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    setOrCreateMeta('meta[property="og:image"]', {
      property: "og:image",
      content: `${origin}${DEFAULT_IMAGE}`,
    });

    setOrCreateMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setOrCreateMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    setOrCreateMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    setOrCreateMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: `${origin}${DEFAULT_IMAGE}`,
    });

    setOrCreateLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
  }, [pathname]);

  return null;
}
