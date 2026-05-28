import React from "react";
import { Link } from "react-router-dom";

/**
 * Breadcrumb — `Projects / RECL / Backlog`
 * items: [{ label, to? }]
 */
export default function Breadcrumb({ items = [], style, className = "" }) {
  return (
    <nav className={`atlas-breadcrumb ${className}`} aria-label="Breadcrumb" style={style}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {item.to && !isLast ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span style={{ color: isLast ? "var(--app-text)" : undefined }}>{item.label}</span>
            )}
            {!isLast ? <span className="sep">/</span> : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
