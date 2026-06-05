import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * AgentDock — global slide-over agent panel.
 *
 * Any component can open the dock via:
 *   const { open } = useAgentDock();
 *   open({ goal, profile_slug });
 *
 * The provider also auto-detects the current route and exposes a "context
 * hint" — a short suggested-goal prefix that frames the agent for whatever
 * page the user is currently on (issue, decision, sprint…).
 *
 * Pages can override the hint with finer detail via useAgentContextHint().
 */

const AgentDockContext = createContext(null);

// Map a pathname to a generic hint. Pages can refine with useAgentContextHint.
function inferHintFromPath(pathname) {
  if (!pathname) return null;
  const issue = pathname.match(/^\/issues\/(\d+)/);
  if (issue) {
    return {
      kind: "issue",
      id: issue[1],
      label: `Issue #${issue[1]}`,
      goalPrefix: `Help me with issue ${issue[1]}. `,
      profile_slug: "general",
    };
  }
  const decision = pathname.match(/^\/decisions\/(\d+)/);
  if (decision) {
    return {
      kind: "decision",
      id: decision[1],
      label: `Decision #${decision[1]}`,
      goalPrefix: `Review decision ${decision[1]} and tell me what's needed to move it forward. `,
      profile_slug: "decision-reviewer",
    };
  }
  const sprint = pathname.match(/^\/sprints?\/(\d+)/);
  if (sprint) {
    return {
      kind: "sprint",
      id: sprint[1],
      label: `Sprint #${sprint[1]}`,
      goalPrefix: `Review sprint ${sprint[1]} and call out anything at risk. `,
      profile_slug: "sprint-coach",
    };
  }
  const project = pathname.match(/^\/projects\/(\d+)/);
  if (project) {
    return {
      kind: "project",
      id: project[1],
      label: `Project #${project[1]}`,
      goalPrefix: `Review project ${project[1]} and propose next moves. `,
      profile_slug: "general",
    };
  }
  if (pathname.startsWith("/sprint")) {
    return {
      kind: "sprint-list",
      label: "Sprints",
      goalPrefix: "Review the current sprint and call out anything at risk. ",
      profile_slug: "sprint-coach",
    };
  }
  if (pathname.startsWith("/decisions")) {
    return {
      kind: "decision-list",
      label: "Decisions",
      goalPrefix: "Audit open decisions and tell me which need follow-up. ",
      profile_slug: "decision-reviewer",
    };
  }
  if (pathname.startsWith("/projects")) {
    return {
      kind: "project-list",
      label: "Projects",
      goalPrefix: "Summarize what's in flight across projects. ",
      profile_slug: "general",
    };
  }
  if (pathname.startsWith("/dashboard") || pathname === "/") {
    return {
      kind: "dashboard",
      label: "Workspace",
      goalPrefix: "Build my standup for today. ",
      profile_slug: "standup",
    };
  }
  return null;
}

export function AgentDockProvider({ children }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [seedGoal, setSeedGoal] = useState("");
  const [seedProfile, setSeedProfile] = useState(null);
  const [activeRunId, setActiveRunId] = useState(null);
  const explicitHintRef = useRef(null);
  const [autoHint, setAutoHint] = useState(() => inferHintFromPath(location.pathname));

  useEffect(() => {
    setAutoHint(inferHintFromPath(location.pathname));
  }, [location.pathname]);

  const activeHint = explicitHintRef.current || autoHint;

  // Pages call this to register a richer hint (e.g. with the issue title).
  const setExplicitHint = useCallback((hint) => {
    explicitHintRef.current = hint
      ? {
          kind: hint.kind || "page",
          label: hint.label || "",
          goalPrefix: hint.goalPrefix || "",
          profile_slug: hint.profile_slug || null,
          starters: hint.starters || null,
        }
      : null;
  }, []);

  const open = useCallback(
    (opts = {}) => {
      const hint = opts.hint || activeHint;
      const seed =
        opts.goal !== undefined && opts.goal !== null
          ? String(opts.goal)
          : hint?.goalPrefix || "";
      const profileSlug = opts.profile_slug || hint?.profile_slug || null;
      setSeedGoal(seed);
      setSeedProfile(profileSlug);
      setActiveRunId(opts.runId || null);
      setIsOpen(true);
    },
    [activeHint]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveRunId(null);
    setSeedGoal("");
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  // Keyboard shortcut: ⌘J (Mac) / Ctrl+J (others) toggles the dock.
  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, close, isOpen]);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      seedGoal,
      seedProfile,
      activeRunId,
      setActiveRunId,
      activeHint,
      setExplicitHint,
    }),
    [isOpen, open, close, toggle, seedGoal, seedProfile, activeRunId, activeHint, setExplicitHint]
  );

  return <AgentDockContext.Provider value={value}>{children}</AgentDockContext.Provider>;
}

export function useAgentDock() {
  const ctx = useContext(AgentDockContext);
  if (!ctx) {
    // Safe no-op when used outside the provider (e.g. in unauthenticated routes).
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      seedGoal: "",
      seedProfile: null,
      activeRunId: null,
      setActiveRunId: () => {},
      activeHint: null,
      setExplicitHint: () => {},
    };
  }
  return ctx;
}

// Page-level hook: registers a context hint for the lifetime of the page,
// then clears it on unmount.
export function useAgentContextHint(hint) {
  const { setExplicitHint } = useAgentDock();
  useEffect(() => {
    setExplicitHint(hint);
    return () => setExplicitHint(null);
  // hint is plain data; stringify so callers don't have to memoize.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(hint)]);
}
