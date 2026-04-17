import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function Proposals() {
  const { darkMode } = useTheme();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const response = await api.get("/api/decisions/proposals/");
      setProposals(response.data || []);
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent }} />
      </div>
    );
  }

  const openProposals = proposals.filter((p) => p.status === "open");
  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const rejectedProposals = proposals.filter((p) => p.status === "rejected");

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: "clamp(16px,2.4vw,24px)",
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(96,165,250,0.14)" : "rgba(191,219,254,0.42)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>DECISION INTAKE</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>Proposals</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Structured proposals before formal decision conversion.</p>
        </div>
        <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
          <BrandedTechnicalIllustration darkMode={darkMode} compact />
          <button onClick={() => setShowCreateModal(true)} style={ui.primaryButton}>Create Proposal</button>
        </div>
      </section>

      <Section title="Open for Discussion" palette={palette}>
        {openProposals.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {openProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onRefresh={fetchProposals} palette={palette} ui={ui} />
            ))}
          </div>
        ) : (
          <EmptyState text="No open proposals." palette={palette} />
        )}
      </Section>

      {acceptedProposals.length ? (
        <Section title="Accepted" palette={palette}>
          <div style={{ display: "grid", gap: 8 }}>
            {acceptedProposals.map((proposal) => (
              <StatusCard key={proposal.id} proposal={proposal} text={`Accepted on ${new Date(proposal.accepted_at).toLocaleDateString()}`} palette={palette} accent={palette.success} />
            ))}
          </div>
        </Section>
      ) : null}

      {rejectedProposals.length ? (
        <Section title="Rejected" palette={palette}>
          <div style={{ display: "grid", gap: 8 }}>
            {rejectedProposals.map((proposal) => (
              <StatusCard key={proposal.id} proposal={proposal} text={`Rejected on ${new Date(proposal.accepted_at).toLocaleDateString()}`} palette={palette} accent={palette.muted} />
            ))}
          </div>
        </Section>
      ) : null}

      {showCreateModal ? <CreateProposalModal onClose={() => setShowCreateModal(false)} onSuccess={fetchProposals} palette={palette} ui={ui} /> : null}
    </div>
  );
}

function ProposalCard({ proposal, onRefresh, palette, ui }) {
  const [showDetails, setShowDetails] = useState(false);
  const [impactLevel, setImpactLevel] = useState("medium");
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.post(`/api/decisions/proposals/${proposal.id}/accept/`, { impact_level: impactLevel });
      window.alert("Proposal accepted and converted to decision.");
      onRefresh();
    } catch (error) {
      window.alert("Failed to accept proposal.");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Reject this proposal?")) return;
    setRejecting(true);
    try {
      await api.post(`/api/decisions/proposals/${proposal.id}/reject/`);
      window.alert("Proposal rejected.");
      onRefresh();
    } catch (error) {
      window.alert("Failed to reject proposal.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <article style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: palette.text }}>{proposal.title}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
            Proposed by {proposal.proposed_by} on {new Date(proposal.created_at).toLocaleDateString()}
          </p>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: palette.accentSoft, color: palette.text }}>Open</span>
      </div>

      <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: palette.muted }}>{proposal.description}</p>

      {showDetails ? (
        <div style={{ background: palette.cardAlt, border: `1px solid ${palette.border}`, borderRadius: 8, padding: 10, marginBottom: 8, display: "grid", gap: 8 }}>
          {proposal.rationale ? <KeyValue title="Rationale" value={proposal.rationale} palette={palette} /> : null}
          {proposal.alternatives_considered ? <KeyValue title="Alternatives" value={proposal.alternatives_considered} palette={palette} /> : null}
          {proposal.risks ? <KeyValue title="Risks" value={proposal.risks} palette={palette} /> : null}
        </div>
      ) : null}

      <button onClick={() => setShowDetails((v) => !v)} style={{ ...ui.secondaryButton, padding: "6px 9px", fontSize: 12, marginBottom: 10 }}>
        {showDetails ? "- Hide details" : "+ Show details"}
      </button>

      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: palette.text }}>Impact Level</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["low", "medium", "high", "critical"].map((level) => {
              const selected = impactLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setImpactLevel(level)}
                  style={{
                    border: `1px solid ${selected ? palette.accent : palette.border}`,
                    background: selected ? palette.accentSoft : palette.cardAlt,
                    color: palette.text,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 8px",
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
          <button onClick={handleAccept} disabled={accepting} style={{ ...ui.primaryButton, opacity: accepting ? 0.6 : 1 }}>
            {accepting ? "Accepting..." : "Accept & Create Decision"}
          </button>
          <button onClick={handleReject} disabled={rejecting} style={{ ...ui.secondaryButton, border: `1px solid ${palette.danger}`, color: palette.danger }}>
            {rejecting ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CreateProposalModal({ onClose, onSuccess, palette, ui }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rationale, setRationale] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [risks, setRisks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/decisions/proposals/", {
        title,
        description,
        rationale,
        alternatives_considered: alternatives,
        risks,
      });
      window.alert("Proposal created.");
      onSuccess();
      onClose();
    } catch (error) {
      window.alert("Failed to create proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 1000, padding: 10 }} onClick={onClose}>
      <div style={{ width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto", borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card }} onClick={(event) => event.stopPropagation()}>
        <div style={{ padding: 14, borderBottom: `1px solid ${palette.border}` }}>
          <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Proposal</h2>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 14, display: "grid", gap: 10 }}>
          <Field label="Title" value={title} onChange={setTitle} required ui={ui} />
          <Field label="Description" value={description} onChange={setDescription} required multiline ui={ui} />
          <Field label="Rationale" value={rationale} onChange={setRationale} multiline ui={ui} placeholder="Why are we considering this?" />
          <Field label="Alternatives Considered" value={alternatives} onChange={setAlternatives} multiline ui={ui} placeholder="What other options did we consider?" />
          <Field label="Risks" value={risks} onChange={setRisks} multiline ui={ui} placeholder="What could go wrong?" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={ui.secondaryButton}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ ...ui.primaryButton, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Creating..." : "Create Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, ui, required = false, multiline = false, placeholder = "" }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={{ ...ui.input, resize: "vertical" }} required={required} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} style={ui.input} required={required} placeholder={placeholder} />
      )}
    </div>
  );
}

function KeyValue({ title, value, palette }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.text }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 13, color: palette.muted }}>{value}</p>
    </div>
  );
}

function Section({ title, palette, children }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 17, color: palette.text }}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text, palette }) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 22, textAlign: "center", color: palette.muted, background: palette.card }}>
      {text}
    </div>
  );
}

function StatusCard({ proposal, text, palette, accent }) {
  return (
    <article style={{ border: `1px solid ${accent || palette.border}`, borderRadius: 12, padding: 12, background: palette.card }}>
      <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: palette.text }}>{proposal.title}</p>
      <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{text}</p>
    </article>
  );
}

export default Proposals;
