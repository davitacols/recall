import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const DocsDrawerContext = createContext(null);

const IS_APPLE = typeof navigator !== "undefined"
  && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

export const DOCS_DRAWER_SHORTCUT_HINT = IS_APPLE ? "⌘ + /" : "Ctrl + /";

export function DocsDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  // Optional slug to preselect a specific page when opening from a context
  // link (e.g. "Open docs about decision intelligence").
  const [seedSlug, setSeedSlug] = useState(null);

  const open = useCallback((opts = {}) => {
    setSeedSlug(opts.slug || null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSeedSlug(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // ⌘ / (Mac) or Ctrl + / (everywhere else) toggles the drawer. The slash
  // key is widely used for "search/help" and doesn't collide with the
  // existing ⌘J (Agent Dock) or ⌘K (search) shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && (e.key === "/" || e.key === "?")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen((prev) => {
          if (prev) return false;
          return prev;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle, seedSlug }),
    [isOpen, open, close, toggle, seedSlug]
  );

  return <DocsDrawerContext.Provider value={value}>{children}</DocsDrawerContext.Provider>;
}

export function useDocsDrawer() {
  const ctx = useContext(DocsDrawerContext);
  if (!ctx) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      seedSlug: null,
    };
  }
  return ctx;
}
