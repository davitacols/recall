import React from "react";
import Breadcrumb from "./Breadcrumb";

/**
 * PageHeader — Atlassian page header pattern.
 * <PageHeader
 *   breadcrumb={[{ label: 'Projects', to: '/projects' }, { label: 'RECL' }]}
 *   title="Backlog"
 *   subtitle="..."
 *   actions={<Button>Create</Button>}
 *   tabs={<Tabs ... />}
 * />
 */
export default function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  tabs,
  style,
}) {
  return (
    <div
      style={{
        padding: "24px 32px 0",
        background: "var(--app-surface)",
        ...style,
      }}
    >
      {breadcrumb?.length ? <Breadcrumb items={breadcrumb} /> : null}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginTop: breadcrumb?.length ? 4 : 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: 24,
              lineHeight: "28px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--app-text)",
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                marginTop: 4,
                fontSize: 14,
                color: "var(--app-muted)",
                lineHeight: 1.4286,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        ) : null}
      </div>
      {tabs ? <div style={{ marginTop: 16 }}>{tabs}</div> : null}
    </div>
  );
}
