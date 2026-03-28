import React from "react";

export function WorkspaceHero({
  palette,
  darkMode,
  eyebrow,
  title,
  description,
  actions,
  stats = [],
  aside,
}) {
  return (
    <section
      className="ui-enter"
      style={{
        ...hero,
        background: "transparent",
      }}
    >
      <div style={heroMain}>
        <div style={{ display: "grid", gap: 8 }}>
          {eyebrow ? <p style={{ ...heroEyebrow, color: palette.muted }}>{eyebrow}</p> : null}
          <h1 style={{ ...heroTitle, color: palette.text }}>{title}</h1>
          {description ? <p style={{ ...heroDescription, color: palette.muted }}>{description}</p> : null}
        </div>
        {actions ? <div style={heroActions}>{actions}</div> : null}
      </div>

      <div style={heroSide}>
        {aside ? <div style={asideWrap}>{aside}</div> : null}
        {stats.length ? (
          <div style={statsGrid}>
            {stats.map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                style={{
                  ...statCard,
                  border: `1px solid ${palette.border}`,
                  background: darkMode
                    ? "linear-gradient(155deg, rgba(33, 28, 24, 0.9), rgba(24, 20, 17, 0.76))"
                    : "linear-gradient(155deg, rgba(255, 252, 248, 0.96), rgba(246, 239, 229, 0.86))",
                }}
              >
                <p style={{ ...statLabel, color: palette.muted }}>{stat.label}</p>
                <p style={{ ...statValue, color: stat.tone || palette.text }}>{stat.value}</p>
                {stat.helper ? <p style={{ ...statHelper, color: palette.muted }}>{stat.helper}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WorkspaceToolbar({ palette, children }) {
  return (
    <section
      className="ui-enter"
      style={{
        ...toolbar,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      {children}
    </section>
  );
}

export function WorkspacePanel({ palette, title, eyebrow, description, action, children, minHeight }) {
  return (
    <section
      className="ui-card-lift ui-smooth"
      style={{
        ...panel,
        minHeight,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      {(title || eyebrow || description || action) && (
        <div style={panelHead}>
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            {eyebrow ? <p style={{ ...panelEyebrow, color: palette.muted }}>{eyebrow}</p> : null}
            {title ? <h2 style={{ ...panelTitle, color: palette.text }}>{title}</h2> : null}
            {description ? <p style={{ ...panelDescription, color: palette.muted }}>{description}</p> : null}
          </div>
          {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </section>
  );
}

export function WorkspaceEmptyState({ palette, title, description, action }) {
  return (
    <div
      style={{
        ...emptyState,
        border: `1px dashed ${palette.border}`,
        background: palette.cardAlt,
        color: palette.muted,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          ...emptyOrb,
          background: `radial-gradient(circle, ${palette.accentSoft}, transparent 72%)`,
        }}
      />
      <p style={{ ...emptyTitle, color: palette.text }}>{title}</p>
      {description ? <p style={emptyDescription}>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

const hero = {
  position: "relative",
  padding: "clamp(2px, 0.6vw, 6px) 0 clamp(4px, 0.8vw, 8px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  alignItems: "start",
};

const heroMain = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  alignContent: "space-between",
  gap: 10,
  minWidth: 0,
};

const heroEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const heroTitle = {
  margin: 0,
  fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
  fontSize: "clamp(1.8rem, 3vw, 3rem)",
  lineHeight: 0.98,
  letterSpacing: "-0.05em",
  maxWidth: "14ch",
};

const heroDescription = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.65,
  maxWidth: 680,
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const heroSide = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  alignContent: "start",
  gap: 8,
};

const asideWrap = {
  display: "flex",
  justifyContent: "flex-end",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const statCard = {
  borderRadius: 24,
  padding: "14px 14px 12px",
  display: "grid",
  gap: 6,
  boxShadow: "var(--ui-shadow-sm)",
};

const statLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const statValue = {
  margin: 0,
  fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
  fontSize: 26,
  fontWeight: 700,
  lineHeight: 0.98,
  letterSpacing: "-0.05em",
};

const statHelper = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
};

const toolbar = {
  borderRadius: 26,
  padding: "16px 18px",
  display: "grid",
  gap: 12,
  boxShadow: "var(--ui-shadow-sm)",
};

const panel = {
  borderRadius: 26,
  padding: "18px",
  display: "grid",
  gap: 14,
  boxShadow: "var(--ui-shadow-sm)",
};

const panelHead = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const panelEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const panelTitle = {
  margin: 0,
  fontFamily: 'var(--font-display, "Fraunces"), Georgia, serif',
  fontSize: 24,
  lineHeight: 1.02,
  letterSpacing: "-0.05em",
};

const panelDescription = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  maxWidth: 620,
};

const emptyState = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 18,
  padding: "28px 18px",
  textAlign: "center",
  display: "grid",
  gap: 8,
  placeItems: "center",
};

const emptyOrb = {
  position: "absolute",
  width: 180,
  height: 180,
  borderRadius: "50%",
  top: -70,
  right: -50,
  pointerEvents: "none",
  filter: "blur(20px)",
};

const emptyTitle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  position: "relative",
  zIndex: 1,
};

const emptyDescription = {
  margin: 0,
  maxWidth: 420,
  fontSize: 13,
  lineHeight: 1.55,
  position: "relative",
  zIndex: 1,
};
