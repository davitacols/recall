import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Breadcrumb,
  Button,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint, useAgentDock } from "../components/AgentDock";
import "./CreateDecision.css";

const IMPACT_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const OUTCOME_META = {
  on_track: { label: "On track", color: "#00875A", tone: "success" },
  exceeded: { label: "Exceeded", color: "#006644", tone: "success" },
  drifting: { label: "Drifted", color: "#FF8B00", tone: "moved" },
  off_track: { label: "Off-track", color: "#DE350B", tone: "removed" },
  mixed: { label: "Mixed", color: "#FF8B00", tone: "moved" },
  no_outcomes: { label: "No outcomes yet", color: "#7A869A", tone: "default" },
};

const DEBOUNCE_MS = 450;

export default function CreateDecision() {
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const agentDock = useAgentDock();

  const [form, setForm] = useState({
    title: "",
    description: "",
    rationale: "",
    impact_level: "medium",
  });
  const [acknowledged, setAcknowledged] = useState({}); // {decision_id: true}
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useAgentContextHint({
    kind: "decision-draft",
    label: form.title ? `Draft · ${form.title.slice(0, 40)}` : "New decision",
    goalPrefix: form.title
      ? `I'm drafting a decision titled "${form.title}". Help me think through it — find similar past decisions and their outcomes. `
      : "Help me think through a new decision. Find similar past decisions and their outcomes. ",
    profile_slug: "decision-reviewer",
  });

  // ─── debounced similar-decisions fetch ────────────────────────────────────

  const fetchSimilar = useCallback(async (title, description) => {
    if (!title.trim() && description.trim().length < 12) {
      setSimilar([]);
      return;
    }
    const myReq = ++requestIdRef.current;
    setSimilarLoading(true);
    try {
      const { data } = await api.post("/api/decisions/intelligence/similar/", {
        title,
        description,
        limit: 6,
      });
      // Drop stale responses if a newer fetch was started.
      if (myReq !== requestIdRef.current) return;
      setSimilar(Array.isArray(data?.results) ? data.results : []);
    } catch (_) {
      if (myReq === requestIdRef.current) setSimilar([]);
    } finally {
      if (myReq === requestIdRef.current) setSimilarLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSimilar(form.title, form.description);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.title, form.description, fetchSimilar]);

  // ─── handlers ────────────────────────────────────────────────────────────

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAck = (id) => {
    setAcknowledged((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        rationale: form.rationale.trim(),
        impact_level: form.impact_level,
        informed_by_decisions: Object.keys(acknowledged).map((id) => Number(id)),
      };
      const { data } = await api.post("/api/decisions/", payload);
      const newId = data?.id || data?.data?.id;
      toast.success?.("Decision created");
      if (newId) navigate(`/decisions/${newId}`);
      else navigate("/decisions");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not create decision.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── derived ─────────────────────────────────────────────────────────────

  const ackCount = useMemo(() => Object.keys(acknowledged).length, [acknowledged]);
  const driftCount = useMemo(
    () => similar.filter((d) => d.outcome_label === "off_track" || d.outcome_label === "drifting").length,
    [similar]
  );

  return (
    <div className="cd">
      <div style={{ padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton
            icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />}
            label="Back"
            onClick={() => navigate(-1)}
          />
          <Breadcrumb
            items={[
              { label: "Knoledgr", to: "/" },
              { label: "Decisions", to: "/decisions" },
              { label: "New decision" },
            ]}
          />
        </div>
      </div>

      <div style={{ padding: "0 32px" }}>
        <PageHeader
          title="New decision"
          subtitle="As you write, we'll surface similar past decisions and their outcomes. Acknowledge the lessons that should inform this one — they'll be recorded on the decision."
          actions={
            <Button
              appearance="subtle"
              iconBefore={<BoltIcon style={{ width: 14, height: 14 }} />}
              onClick={() => agentDock.open()}
              title="Ask the decision-reviewer agent (⌘J)"
            >
              Ask Agent
            </Button>
          }
          style={{ padding: "0", marginTop: 12, background: "transparent" }}
        />
      </div>

      <div className="cd-grid" style={{ padding: "16px 32px 32px" }}>
        <section className="cd-main">
          {error ? <SectionMessage tone="error" style={{ marginBottom: 12 }}>{error}</SectionMessage> : null}

          <form onSubmit={handleSubmit} className="cd-form">
            <Field label="Title" isRequired helpText="Be specific. Past similar decisions surface from this.">
              <input
                className="atlas-input"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Adopt OAuth provider X for SSO"
                required
                autoFocus
              />
            </Field>

            <Field label="Description" isRequired>
              <textarea
                className="atlas-input"
                rows={5}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="What's the decision, what alternatives did you consider, and what's the scope?"
                required
              />
            </Field>

            <Field label="Rationale" helpText="Why this choice over the alternatives.">
              <textarea
                className="atlas-input"
                rows={3}
                value={form.rationale}
                onChange={(e) => setField("rationale", e.target.value)}
              />
            </Field>

            <Field label="Impact level">
              <select
                className="atlas-input"
                value={form.impact_level}
                onChange={(e) => setField("impact_level", e.target.value)}
              >
                {IMPACT_LEVELS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </Field>

            {ackCount > 0 ? (
              <SectionMessage tone="discovery">
                <strong>{ackCount}</strong> past decision{ackCount === 1 ? "" : "s"} acknowledged as informing this one — the lineage will be saved with the decision.
              </SectionMessage>
            ) : null}

            <div className="cd-actions">
              <Button appearance="subtle" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button
                appearance="primary"
                type="submit"
                isDisabled={submitting || !form.title.trim() || !form.description.trim()}
              >
                {submitting ? "Saving…" : "Save decision"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="cd-side">
          <SimilarPanel
            similar={similar}
            loading={similarLoading}
            isEmpty={!form.title.trim() && form.description.trim().length < 12}
            acknowledged={acknowledged}
            onToggleAck={toggleAck}
            driftCount={driftCount}
          />
        </aside>
      </div>
    </div>
  );
}

// ─── side panel ────────────────────────────────────────────────────────────

function SimilarPanel({ similar, loading, isEmpty, acknowledged, onToggleAck, driftCount }) {
  return (
    <div className="cd-panel">
      <header className="cd-panel-head">
        <div className="cd-panel-mark">
          <SparklesIcon />
        </div>
        <div>
          <p className="cd-panel-title">Before you decide</p>
          <p className="cd-panel-sub">Similar past decisions, with their outcomes.</p>
        </div>
        {loading ? <span className="cd-panel-spinner" /> : null}
      </header>

      {driftCount > 0 ? (
        <div className="cd-panel-warning">
          <ExclamationTriangleIcon />
          <span>
            <strong>{driftCount}</strong> similar past decision{driftCount === 1 ? "" : "s"} drifted off-track. Worth reading the lessons before you commit.
          </span>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="cd-panel-empty">
          <LightBulbIcon />
          <p>Start typing a title and description — we'll surface past decisions that touched similar ground.</p>
        </div>
      ) : similar.length === 0 && !loading ? (
        <div className="cd-panel-empty">
          <CheckCircleIcon />
          <p>No similar past decisions found yet. You're charting new ground.</p>
        </div>
      ) : (
        <ul className="cd-similar-list">
          {similar.map((d) => (
            <SimilarCard
              key={d.id}
              decision={d}
              acknowledged={!!acknowledged[d.id]}
              onToggleAck={() => onToggleAck(d.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SimilarCard({ decision, acknowledged, onToggleAck }) {
  const meta = OUTCOME_META[decision.outcome_label] || OUTCOME_META.no_outcomes;
  const lessons = decision.lessons || [];
  return (
    <li className={`cd-similar ${acknowledged ? "is-ack" : ""}`}>
      <div className="cd-similar-head">
        <Link to={decision.url} className="cd-similar-title">
          {decision.title}
        </Link>
        <span className="cd-similar-band" style={{ background: `${meta.color}1f`, color: meta.color }}>
          <span className="cd-similar-dot" style={{ background: meta.color }} />
          {meta.label}
          {typeof decision.worst_drift_pct === "number"
            ? ` (${decision.worst_drift_pct > 0 ? "+" : ""}${decision.worst_drift_pct.toFixed(0)}%)`
            : ""}
        </span>
      </div>
      <div className="cd-similar-meta">
        <Lozenge>{decision.status?.replace(/_/g, " ")}</Lozenge>
        {decision.impact_level ? <Lozenge>{decision.impact_level} impact</Lozenge> : null}
        {decision.prediction_count > 0 ? (
          <span className="cd-similar-pred">{decision.prediction_count} prediction{decision.prediction_count === 1 ? "" : "s"}</span>
        ) : null}
      </div>

      {lessons.length > 0 ? (
        <div className="cd-similar-lessons">
          {lessons.slice(0, 2).map((l) => (
            <div key={l.id} className="cd-similar-lesson">
              <LightBulbIcon />
              <div>
                <p>{l.text}</p>
                {(l.tags?.length || typeof l.confidence_delta === "number") ? (
                  <div className="cd-similar-lesson-meta">
                    {l.tags?.slice(0, 3).map((t) => <Lozenge key={t}>{t}</Lozenge>)}
                    {typeof l.confidence_delta === "number" ? (
                      <span className={`cd-similar-delta cd-similar-delta--${l.confidence_delta > 0 ? "positive" : l.confidence_delta < 0 ? "negative" : "neutral"}`}>
                        Δ {l.confidence_delta > 0 ? "+" : ""}{l.confidence_delta}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="cd-similar-no-lessons">No retrospective on this one yet.</p>
      )}

      <div className="cd-similar-foot">
        <Link to={decision.url} className="cd-similar-open">
          Open <ChevronRightIcon />
        </Link>
        <button
          type="button"
          className={`cd-similar-ack ${acknowledged ? "is-on" : ""}`}
          onClick={onToggleAck}
        >
          {acknowledged ? (
            <>
              <CheckCircleIcon /> Acknowledged
            </>
          ) : (
            "Use this lesson"
          )}
        </button>
      </div>
    </li>
  );
}
