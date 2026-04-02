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
  const enhanced = execution || memory;

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
      {enhanced ? (
        <>
          <div
            aria-hidden="true"
            style={{
              ...heroAura,
              background: execution
                ? darkMode
                  ? "radial-gradient(circle, rgba(154, 185, 255, 0.18), transparent 70%)"
                  : "radial-gradient(circle, rgba(46, 99, 208, 0.14), transparent 70%)"
                : darkMode
                  ? "radial-gradient(circle, rgba(109, 174, 255, 0.18), transparent 70%)"
                  : "radial-gradient(circle, rgba(66, 125, 214, 0.14), transparent 70%)",
              top: -120,
              left: -80,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              ...heroAura,
              background: execution
                ? darkMode
                  ? "radial-gradient(circle, rgba(210, 168, 106, 0.14), transparent 70%)"
                  : "radial-gradient(circle, rgba(168, 116, 57, 0.1), transparent 70%)"
                : darkMode
                  ? "radial-gradient(circle, rgba(94, 214, 183, 0.16), transparent 70%)"
                  : "radial-gradient(circle, rgba(42, 147, 133, 0.1), transparent 70%)",
              right: -120,
              bottom: -110,
            }}
          />
        </>
      ) : null}

      <div style={{ ...heroMain, gap: enhanced ? 14 : heroMain.gap }}>
        <div style={{ display: "grid", gap: 8 }}>
          {eyebrow ? <p style={{ ...heroEyebrow, color: palette.muted }}>{eyebrow}</p> : null}
          <h1 style={{ ...heroTitle, color: palette.text }}>{title}</h1>
          {description ? <p style={{ ...heroDescription, color: palette.muted }}>{description}</p> : null}
        </div>
        {actions ? <div style={heroActions}>{actions}</div> : null}
      </div>

      <div style={heroSide}>
        {aside ? <div style={{ ...asideWrap, justifyContent: enhanced ? "stretch" : asideWrap.justifyContent }}>{aside}</div> : null}
        {stats.length ? (
          <div style={statsGrid}>
            {stats.map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                style={{
                  ...statCard,
                  ...(enhanced
                    ? {
                        borderRadius: 22,
                        padding: "16px 16px 14px",
                      }
                    : null),
                  border: `1px solid ${palette.border}`,
                  background: execution
                    ? darkMode
                      ? "linear-gradient(150deg, rgba(35, 29, 25, 0.96), rgba(24, 20, 17, 0.84))"
                      : "linear-gradient(150deg, rgba(255, 252, 248, 0.98), rgba(245, 239, 229, 0.9))"
                    : memory
                      ? darkMode
                        ? "linear-gradient(150deg, rgba(23, 28, 37, 0.96), rgba(18, 22, 30, 0.86))"
                        : "linear-gradient(150deg, rgba(248, 251, 255, 0.98), rgba(236, 244, 252, 0.92))"
                      : darkMode
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
  const enhanced = execution || memory;

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
        background: execution
          ? darkMode
            ? "linear-gradient(150deg, rgba(24, 20, 18, 0.96), rgba(31, 26, 23, 0.9))"
            : "linear-gradient(150deg, rgba(255, 252, 248, 0.98), rgba(247, 242, 235, 0.94))"
          : memory
            ? darkMode
              ? "linear-gradient(150deg, rgba(18, 22, 30, 0.96), rgba(25, 31, 42, 0.9))"
              : "linear-gradient(150deg, rgba(249, 252, 255, 0.98), rgba(241, 247, 252, 0.95))"
          : palette.card,
      }}
    >
      {(title || eyebrow || description || action) && (
        <div
          style={{
            ...panelHead,
            ...(enhanced
              ? {
                  paddingBottom: 14,
                  borderBottom: `1px solid ${palette.border}`,
                }
              : null),
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
  const execution = variant === "execution";
  const memory = variant === "memory";
  const enhanced = execution || memory;

  return (
    <div
      style={{
        ...emptyState,
        ...(execution
          ? getExecutionEmptyShell(palette, darkMode)
          : memory
            ? getMemoryEmptyShell(palette, darkMode)
            : null),
        border: `1px dashed ${palette.border}`,
        background: execution
          ? darkMode
            ? "linear-gradient(150deg, rgba(31, 26, 23, 0.9), rgba(24, 20, 17, 0.82))"
            : "linear-gradient(150deg, rgba(255, 252, 248, 0.96), rgba(241, 233, 221, 0.94))"
          : memory
            ? darkMode
              ? "linear-gradient(150deg, rgba(18, 22, 30, 0.9), rgba(23, 29, 39, 0.82))"
              : "linear-gradient(150deg, rgba(248, 251, 255, 0.96), rgba(236, 244, 252, 0.94))"
          : palette.cardAlt,
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

const heroAura = {
  position: "absolute",
  width: 280,
  height: 280,
  borderRadius: "50%",
  filter: "blur(18px)",
  pointerEvents: "none",
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

function getExecutionHeroShell(palette, darkMode) {
  return {
    padding: "clamp(20px, 2.8vw, 30px)",
    borderRadius: 32,
    border: `1px solid ${palette.border}`,
    background: darkMode
      ? "linear-gradient(145deg, rgba(24, 20, 18, 0.96) 0%, rgba(31, 26, 23, 0.94) 56%, rgba(39, 33, 29, 0.9) 100%)"
      : "linear-gradient(145deg, rgba(255, 252, 248, 0.98) 0%, rgba(247, 242, 235, 0.98) 58%, rgba(241, 233, 221, 0.94) 100%)",
    boxShadow: "var(--ui-shadow-sm)",
    overflow: "hidden",
  };
}

function getExecutionToolbarShell(palette, darkMode) {
  return {
    borderRadius: 28,
    padding: "18px 20px",
    boxShadow: "var(--ui-shadow-sm)",
    backdropFilter: darkMode ? "none" : "blur(10px)",
  };
}

function getExecutionPanelShell(palette, darkMode) {
  return {
    borderRadius: 28,
    padding: "20px",
    boxShadow: "var(--ui-shadow-sm)",
  };
}

function getExecutionEmptyShell(palette, darkMode) {
  return {
    borderRadius: 22,
    padding: "32px 20px",
    boxShadow: "var(--ui-shadow-xs)",
  };
}

function getMemoryHeroShell(palette, darkMode) {
  return {
    padding: "clamp(20px, 2.8vw, 30px)",
    borderRadius: 34,
    border: `1px solid ${palette.border}`,
    background: darkMode
      ? "linear-gradient(145deg, rgba(16, 20, 27, 0.97) 0%, rgba(22, 28, 38, 0.95) 58%, rgba(28, 37, 50, 0.9) 100%)"
      : "linear-gradient(145deg, rgba(248, 251, 255, 0.99) 0%, rgba(239, 246, 252, 0.98) 58%, rgba(232, 241, 249, 0.94) 100%)",
    boxShadow: "var(--ui-shadow-sm)",
    overflow: "hidden",
  };
}

function getMemoryToolbarShell(palette, darkMode) {
  return {
    borderRadius: 30,
    padding: "18px 20px",
    boxShadow: "var(--ui-shadow-sm)",
    backdropFilter: darkMode ? "none" : "blur(12px)",
  };
}

function getMemoryPanelShell(palette, darkMode) {
  return {
    borderRadius: 30,
    padding: "20px",
    boxShadow: "var(--ui-shadow-sm)",
  };
}

function getMemoryEmptyShell(palette, darkMode) {
  return {
    borderRadius: 24,
    padding: "32px 20px",
    boxShadow: "var(--ui-shadow-xs)",
  };
}
