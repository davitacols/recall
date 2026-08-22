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
 *
 * Layout lives in index.css rather than inline. It was a flex row where the
 * title could shrink to nothing (minWidth: 0) while the actions could not
 * (flexShrink: 0) and nothing wrapped — so on a phone the buttons held their
 * width and squeezed the title away. Inline styles cannot carry a media
 * query, so the fix has to be in a stylesheet.
 *
 * The `style` prop still lands on the root, because callers use it to override
 * padding and background.
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
    <div className="aph" style={style}>
      {breadcrumb?.length ? <Breadcrumb items={breadcrumb} /> : null}
      <div className="aph-row" style={{ marginTop: breadcrumb?.length ? 4 : 0 }}>
        <div className="aph-main">
          <h1 className="aph-title">{title}</h1>
          {subtitle ? <p className="aph-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="aph-actions">{actions}</div> : null}
      </div>
      {tabs ? <div className="aph-tabs">{tabs}</div> : null}
    </div>
  );
}
