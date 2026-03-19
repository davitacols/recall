import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

function toneStyles(palette, tone) {
  if (tone === "danger") {
    return {
      border: palette.danger,
      background: "rgba(200, 86, 93, 0.12)",
      accent: palette.danger,
    };
  }
  if (tone === "info") {
    return {
      border: palette.accent,
      background: palette.accentSoft,
      accent: palette.accent,
    };
  }
  return {
    border: palette.warn,
    background: "rgba(168, 116, 57, 0.12)",
    accent: palette.warn,
  };
}

export default function UpgradeNotice({
  palette,
  title,
  description,
  currentPlan,
  requiredPlan,
  tone = "warn",
  ctaTo = "/subscription",
  ctaLabel = "Upgrade plan",
  secondaryTo,
  secondaryLabel,
}) {
  const styles = toneStyles(palette, tone);

  return (
    <section
      style={{
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${styles.border}`,
        background: styles.background,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: styles.accent }}>
            Upgrade Path
          </p>
          <ArrowTrendingUpIcon style={{ width: 16, height: 16, color: styles.accent, flexShrink: 0 }} />
        </div>
        <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.05, letterSpacing: "-0.04em", color: palette.text, fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif' }}>
          {title}
        </h3>
        {description ? (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: palette.muted }}>
            {description}
          </p>
        ) : null}
      </div>

      {(currentPlan || requiredPlan) ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {currentPlan ? (
            <span style={{ borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 700, color: palette.text, background: palette.card, border: `1px solid ${palette.border}` }}>
              Current: {currentPlan}
            </span>
          ) : null}
          {requiredPlan ? (
            <span style={{ borderRadius: 999, padding: "7px 10px", fontSize: 11, fontWeight: 700, color: styles.accent, background: palette.card, border: `1px solid ${styles.border}` }}>
              Recommended: {requiredPlan}
            </span>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          className="ui-btn-polish ui-focus-ring"
          to={ctaTo}
          style={{
            borderRadius: 999,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 700,
            color: palette.buttonText,
            background: palette.ctaGradient,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CreditCardIcon style={{ width: 14, height: 14 }} />
          {ctaLabel}
        </Link>
        {secondaryTo && secondaryLabel ? (
          <Link
            className="ui-btn-polish ui-focus-ring"
            to={secondaryTo}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 700,
              color: palette.text,
              background: palette.card,
              border: `1px solid ${palette.border}`,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BuildingOffice2Icon style={{ width: 14, height: 14 }} />
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
