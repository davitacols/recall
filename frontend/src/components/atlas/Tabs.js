import React, { useState } from "react";

/**
 * Tabs — underline-style.
 * <Tabs
 *   tabs={[{ id, label, count? }]}
 *   value={id}
 *   onChange={(id) => ...}
 * />
 */
export default function Tabs({ tabs = [], value, defaultValue, onChange, style, className = "" }) {
  const [internal, setInternal] = useState(defaultValue || tabs[0]?.id);
  const active = value !== undefined ? value : internal;
  const handle = (id) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };
  return (
    <div role="tablist" className={`atlas-tab-row ${className}`} style={style}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className="atlas-tab"
          onClick={() => handle(t.id)}
        >
          <span>{t.label}</span>
          {typeof t.count === "number" ? (
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                color: "var(--app-muted)",
                fontWeight: 600,
              }}
            >
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
