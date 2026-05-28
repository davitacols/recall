import React from "react";
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

const toneStyles = {
  info:      { bg: "var(--t50)", border: "var(--t400)", icon: InformationCircleIcon, iconColor: "var(--t500)" },
  warning:   { bg: "var(--y50)", border: "var(--y400)", icon: ExclamationTriangleIcon, iconColor: "var(--y500)" },
  error:     { bg: "var(--r50)", border: "var(--r400)", icon: XCircleIcon, iconColor: "var(--r500)" },
  success:   { bg: "var(--g50)", border: "var(--g400)", icon: CheckCircleIcon, iconColor: "var(--g500)" },
  discovery: { bg: "var(--p50)", border: "var(--p400)", icon: LightBulbIcon, iconColor: "var(--p500)" },
};

/**
 * SectionMessage — info/warning/error/success/discovery banner.
 */
export default function SectionMessage({ tone = "info", title, children, actions, style }) {
  const t = toneStyles[tone] || toneStyles.info;
  const Icon = t.icon;
  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        background: t.bg,
        borderRadius: 4,
        borderLeft: `4px solid ${t.border}`,
        ...style,
      }}
    >
      <Icon style={{ width: 20, height: 20, color: t.iconColor, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <p style={{ fontWeight: 600, color: "var(--app-text)", fontSize: 14, marginBottom: 4 }}>
            {title}
          </p>
        ) : null}
        <div style={{ fontSize: 14, color: "var(--app-text)" }}>{children}</div>
        {actions ? <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{actions}</div> : null}
      </div>
    </div>
  );
}
