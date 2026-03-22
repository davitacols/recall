import React from "react";
import { Link } from "react-router-dom";

export default function PublicPolicyPage({
  eyebrow,
  title,
  lead,
  effectiveDate,
  updatedDate,
  contactLabel,
  contactEmail,
  summaryCards,
  sections,
  footerLinks,
}) {
  return (
    <div style={page}>
      <div style={shell}>
        <Link to="/" style={backButton}>
          Back to Home
        </Link>

        <header style={hero}>
          <p style={eyebrowStyle}>{eyebrow}</p>
          <h1 style={titleStyle}>{title}</h1>
          <p style={leadStyle}>{lead}</p>

          <div style={metaGrid}>
            <div style={metaCard}>
              <p style={metaLabel}>Effective Date</p>
              <p style={metaValue}>{effectiveDate}</p>
            </div>
            <div style={metaCard}>
              <p style={metaLabel}>Last Updated</p>
              <p style={metaValue}>{updatedDate}</p>
            </div>
            <div style={metaCard}>
              <p style={metaLabel}>{contactLabel}</p>
              <a href={`mailto:${contactEmail}`} style={metaLink}>
                {contactEmail}
              </a>
            </div>
          </div>

          <div style={summaryGrid}>
            {summaryCards.map((card) => (
              <article key={card.title} style={summaryCard}>
                <h2 style={summaryTitle}>{card.title}</h2>
                <p style={summaryCopy}>{card.text}</p>
              </article>
            ))}
          </div>
        </header>

        <div style={contentGrid}>
          <aside style={tocCard}>
            <p style={tocEyebrow}>On this page</p>
            <nav style={tocNav}>
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} style={tocLink}>
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <main style={mainColumn}>
            {sections.map((section) => (
              <section key={section.id} id={section.id} style={sectionCard}>
                <h2 style={sectionTitle}>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} style={copy}>
                    {paragraph}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul style={list}>
                    {section.bullets.map((bullet) => (
                      <li key={typeof bullet === "string" ? bullet : bullet.text} style={listItem}>
                        {renderBullet(bullet)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section style={footerCard}>
              <p style={footerEyebrow}>Related documents</p>
              <div style={footerLinksStyle}>
                {footerLinks.map((link) =>
                  link.href.startsWith("mailto:") ? (
                    <a key={link.label} href={link.href} style={footerLink}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} to={link.href} style={footerLink}>
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function renderBullet(bullet) {
  if (typeof bullet === "string") {
    return renderContactLine(bullet);
  }

  if (bullet?.href) {
    return (
      <>
        {bullet.prefix ? `${bullet.prefix} ` : ""}
        <a href={bullet.href} style={inlineLink}>
          {bullet.text}
        </a>
        {bullet.suffix ? ` ${bullet.suffix}` : ""}
      </>
    );
  }

  return bullet?.text || "";
}

function renderContactLine(text) {
  const [label, email] = text.split(": ");
  if (!label || !email || !email.includes("@")) return text;

  return (
    <>
      {label}:{" "}
      <a href={`mailto:${email}`} style={inlineLink}>
        {email}
      </a>
    </>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(151, 188, 255, 0.22), transparent 30%), linear-gradient(180deg, #f5f0e7 0%, #fbf8f3 52%, #f3eee5 100%)",
  color: "#172033",
  padding: "32px 16px 56px",
};

const shell = {
  maxWidth: 1140,
  margin: "0 auto",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(23, 32, 51, 0.12)",
  background: "rgba(255,255,255,0.7)",
  color: "#172033",
  textDecoration: "none",
  fontWeight: 700,
  marginBottom: 18,
};

const hero = {
  display: "grid",
  gap: 18,
};

const eyebrowStyle = {
  margin: 0,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a6749",
};

const titleStyle = {
  margin: 0,
  fontSize: "clamp(2.6rem, 5vw, 4.4rem)",
  lineHeight: 0.98,
  letterSpacing: "-0.05em",
  fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
};

const leadStyle = {
  margin: 0,
  maxWidth: 840,
  fontSize: 17,
  lineHeight: 1.8,
  color: "#4e596d",
};

const metaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const metaCard = {
  borderRadius: 22,
  padding: 18,
  border: "1px solid rgba(23, 32, 51, 0.1)",
  background: "rgba(255,255,255,0.74)",
  boxShadow: "0 18px 40px rgba(23, 32, 51, 0.06)",
};

const metaLabel = {
  margin: "0 0 8px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7c6956",
};

const metaValue = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: "#172033",
};

const metaLink = {
  color: "#1f4b99",
  textDecoration: "none",
  fontWeight: 700,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const summaryCard = {
  borderRadius: 24,
  padding: 20,
  border: "1px solid rgba(23, 32, 51, 0.1)",
  background: "rgba(255,255,255,0.8)",
  boxShadow: "0 22px 50px rgba(23, 32, 51, 0.07)",
};

const summaryTitle = {
  margin: "0 0 10px",
  fontSize: 18,
  lineHeight: 1.2,
  color: "#172033",
};

const summaryCopy = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.75,
  color: "#556074",
};

const contentGrid = {
  display: "grid",
  gap: 20,
  alignItems: "start",
  marginTop: 26,
};

const tocCard = {
  borderRadius: 24,
  padding: 18,
  border: "1px solid rgba(23, 32, 51, 0.1)",
  background: "rgba(255,255,255,0.72)",
  boxShadow: "0 18px 40px rgba(23, 32, 51, 0.06)",
};

const tocEyebrow = {
  margin: "0 0 12px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a6749",
};

const tocNav = {
  display: "grid",
  gap: 10,
};

const tocLink = {
  color: "#1f324e",
  textDecoration: "none",
  lineHeight: 1.55,
  fontSize: 14,
  fontWeight: 600,
};

const mainColumn = {
  display: "grid",
  gap: 16,
};

const sectionCard = {
  borderRadius: 24,
  padding: 22,
  border: "1px solid rgba(23, 32, 51, 0.1)",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 22px 50px rgba(23, 32, 51, 0.07)",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: 24,
  lineHeight: 1.15,
  letterSpacing: "-0.03em",
  color: "#172033",
};

const copy = {
  margin: "0 0 12px",
  fontSize: 15,
  lineHeight: 1.8,
  color: "#4e596d",
};

const list = {
  margin: "4px 0 0",
  paddingLeft: 22,
  color: "#4e596d",
};

const listItem = {
  marginBottom: 10,
  lineHeight: 1.75,
};

const footerCard = {
  borderRadius: 24,
  padding: 22,
  border: "1px solid rgba(23, 32, 51, 0.1)",
  background: "rgba(248, 243, 235, 0.86)",
};

const footerEyebrow = {
  margin: "0 0 10px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a6749",
};

const footerLinksStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const footerLink = {
  color: "#1f4b99",
  textDecoration: "none",
  fontWeight: 700,
};

const inlineLink = {
  color: "#1f4b99",
  textDecoration: "none",
  fontWeight: 700,
};
