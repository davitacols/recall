import React from "react";

export function WorkspaceHero({
  palette,
  darkMode,
  variant = "default",
  eyebrow,
  title,
  description,
  actions,
  stats = [],
  aside,
}) {
  const execution = variant === "execution";
  const memory = variant === "memory";
  const hasAside = Boolean(aside);
  const hasStats = stats.length > 0;

  return (
    <section
      className="ui-enter"
      style={{
        ...hero,
        ...(execution
          ? getExecutionHeroShell(palette, darkMode)
          : memory
            ? getMemoryHeroShell(palette, darkMode)
            : { background: "transparent" }),
      }}
    >
      <div style={{ ...heroHeader, ...(hasAside ? null : heroHeaderCompact) }}>
        <div style={heroMain}>
          <div style={heroLead}>
            {eyebrow ? <p style={{ ...heroEyebrow, color: palette.muted }}>{eyebrow}</p> : null}
            <div style={heroCopy}>
              <h1 style={{ ...heroTitle, color: palette.text }}>{title}</h1>
              {description ? <p style={{ ...heroDescription, color: palette.muted }}>{description}</p> : null}
            </div>
          </div>
          {actions ? <div style={heroActions}>{actions}</div> : null}
        </div>

        {hasAside ? (
          <div style={heroSide}>
            <div style={asideWrap}>{aside}</div>
          </div>
        ) : null}
      </div>

      {hasStats ? (
        <div style={{ ...heroFooter, borderTop: `1px solid ${palette.border}` }}>
          <div style={statsGrid}>
            {stats.map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                style={{
                  ...statCard,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                }}
              >
                <div style={statMeta}>
                  <p style={{ ...statLabel, color: palette.muted }}>{stat.label}</p>
                  {stat.helper ? <p style={{ ...statHelper, color: palette.muted }}>{stat.helper}</p> : null}
                </div>
                <p style={{ ...statValue, color: stat.tone || palette.text }}>{stat.value}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceToolbar({ palette, variant = "default", darkMode, children }) {
  const execution = variant === "execution";
  const memory = variant === "memory";

  return (
    <section
      className="ui-enter"
      style={{
        ...toolbar,
        ...(execution
          ? getExecutionToolbarShell(palette, darkMode)
          : memory
            ? getMemoryToolbarShell(palette, darkMode)
            : null),
        border: `1px solid ${palette.border}`,
        background: execution
          ? darkMode
            ? "linear-gradient(150deg, rgba(26, 22, 18, 0.94), rgba(34, 29, 25, 0.86))"
            : "linear-gradient(150deg, rgba(255, 252, 248, 0.98), rgba(245, 239, 229, 0.9))"
          : memory
            ? darkMode
              ? "linear-gradient(150deg, rgba(18, 22, 30, 0.94), rgba(25, 31, 42, 0.88))"
              : "linear-gradient(150deg, rgba(248, 251, 255, 0.98), rgba(238, 245, 252, 0.94))"
          : palette.card,
      }}
    >
      {children}
    </section>
  );
}

export function WorkspacePanel({ palette, variant = "default", darkMode, title, eyebrow, description, action, children, minHeight }) {
  const execution = variant === "execution";
  const memory = variant === "memory";

  return (
    <section
      className="ui-card-lift ui-smooth"
      style={{
        ...panel,
        ...(execution
          ? getExecutionPanelShell(palette, darkMode)
          : memory
            ? getMemoryPanelShell(palette, darkMode)
            : null),
        minHeight,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      {(title || eyebrow || description || action) && (
        <div
          style={{
            ...panelHead,
            paddingBottom: 12,
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
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

export function WorkspaceEmptyState({ palette, variant = "default", darkMode, title, description, action }) {
  return (
    <div
      style={{
        ...emptyState,
        ...(variant === "execution"
          ? getExecutionEmptyShell(palette, darkMode)
          : variant === "memory"
            ? getMemoryEmptyShell(palette, darkMode)
            : null),
        border: `1px dashed ${palette.border}`,
        background: palette.cardAlt,
        color: palette.muted,
      }}
    >
      <p style={{ ...emptyTitle, color: palette.text }}>{title}</p>
      {description ? <p style={emptyDescription}>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

const hero = {
  position: "relative",
  padding: "clamp(2px, 0.3vw, 4px) 0 clamp(2px, 0.45vw, 6px)",
  display: "grid",
  gap: 12,
  alignItems: "start",
};

const heroHeader = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.45fr) minmax(260px, 0.78fr)",
  gap: 14,
  alignItems: "start",
};

const heroHeaderCompact = {
  gridTemplateColumns: "minmax(0, 1fr)",
};

const heroMain = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  alignContent: "start",
  gap: 10,
  minWidth: 0,
};

const heroLead = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const heroCopy = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const heroEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const heroTitle = {
  margin: 0,
  fontFamily: "inherit",
  fontSize: "clamp(1.3rem, 1.7vw, 1.75rem)",
  lineHeight: 1.12,
  letterSpacing: "-0.03em",
  fontWeight: 700,
  maxWidth: "26ch",
};

const heroDescription = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 760,
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  minWidth: 0,
};

const heroSide = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const asideWrap = {
  display: "grid",
  minWidth: 0,
};

const heroFooter = {
  display: "grid",
  gap: 8,
  paddingTop: 10,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const statCard = {
  borderRadius: 12,
  padding: "10px 11px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  minWidth: 0,
};

const statMeta = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const statLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const statValue = {
  margin: 0,
  fontFamily: "inherit",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  textAlign: "right",
  flexShrink: 0,
};

const statHelper = {
  margin: 0,
  fontSize: 11,
  lineHeight: 1.4,
  maxWidth: 240,
};

const toolbar = {
  borderRadius: 26,
  padding: "16px 18px",
  display: "grid",
  gap: 12,
  boxShadow: "var(--ui-shadow-sm)",
};

const panel = {
  borderRadius: 16,
  padding: "14px",
  display: "grid",
  gap: 12,
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
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const panelTitle = {
  margin: 0,
  fontFamily: 'var(--font-display, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 20,
  lineHeight: 1.08,
  letterSpacing: "-0.03em",
};

const panelDescription = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 620,
};

const emptyState = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 14,
  padding: "22px 16px",
  textAlign: "center",
  display: "grid",
  gap: 6,
  placeItems: "center",
};

const emptyTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  position: "relative",
  zIndex: 1,
};

const emptyDescription = {
  margin: 0,
  maxWidth: 420,
  fontSize: 12,
  lineHeight: 1.5,
  position: "relative",
  zIndex: 1,
};

function getExecutionHeroShell(palette) {
  return {
    padding: "clamp(14px, 1.8vw, 18px)",
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    overflow: "hidden",
  };
}

function getExecutionToolbarShell(darkMode) {
  return {
    borderRadius: 28,
    padding: "18px 20px",
    boxShadow: "var(--ui-shadow-sm)",
    backdropFilter: darkMode ? "none" : "blur(10px)",
  };
}

function getExecutionPanelShell() {
  return {
    borderRadius: 16,
    padding: "14px",
  };
}

function getExecutionEmptyShell() {
  return {
    borderRadius: 14,
    padding: "22px 16px",
  };
}

function getMemoryHeroShell(palette) {
  return {
    padding: "clamp(14px, 1.8vw, 18px)",
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    background: palette.card,
    overflow: "hidden",
  };
}

function getMemoryToolbarShell(darkMode) {
  return {
    borderRadius: 30,
    padding: "18px 20px",
    boxShadow: "var(--ui-shadow-sm)",
    backdropFilter: darkMode ? "none" : "blur(12px)",
  };
}

function getMemoryPanelShell() {
  return {
    borderRadius: 16,
    padding: "14px",
  };
}

function getMemoryEmptyShell() {
  return {
    borderRadius: 14,
    padding: "22px 16px",
  };
}
