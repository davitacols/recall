import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BoltIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Breadcrumb,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import { useAgentContextHint, useAgentDock } from "../components/AgentDock";
import GitHubPRPicker from "../components/integrations/GitHubPRPicker";
import "./DecisionDetail.css";

// ─── constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "proposed", label: "Proposed", variant: "new" },
  { value: "under_review", label: "Under Review", variant: "moved" },
  { value: "approved", label: "Approved", variant: "success" },
  { value: "rejected", label: "Rejected", variant: "removed" },
  { value: "implemented", label: "Implemented", variant: "success" },
  { value: "cancelled", label: "Cancelled", variant: "default" },
];

const IMPACT_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const METRIC_KINDS = [
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "binary", label: "Yes / No" },
  { value: "text", label: "Qualitative" },
];

const DRIFT_BAND_META = {
  on_track: { label: "On track", tone: "success", color: "#00875A" },
  exceeded: { label: "Exceeded", tone: "success", color: "#006644" },
  drifting: { label: "Drifting", tone: "moved", color: "#FF8B00" },
  off_track: { label: "Off track", tone: "removed", color: "#DE350B" },
  unknown: { label: "Pending", tone: "default", color: "#7A869A" },
  no_outcomes: { label: "No outcomes yet", tone: "default", color: "#7A869A" },
  mixed: { label: "Mixed", tone: "moved", color: "#FF8B00" },
};

const MARKDOWN_PLUGINS = [remarkGfm];

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(value, opts) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, opts || { month: "short", day: "numeric", year: "numeric" });
}

function statusVariant(s) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.variant || "default";
}

function impactVariant(level) {
  if (level === "critical" || level === "high") return "removed";
  if (level === "medium") return "moved";
  return "default";
}

function describeTarget(p) {
  const t = p?.target_value || {};
  if (p?.metric_kind === "binary") return t.value ? "Yes" : "No";
  if (p?.metric_kind === "text") return t.value ? String(t.value) : "—";
  if (t.value === undefined || t.value === null) return "—";
  const unit = t.unit ? ` ${t.unit}` : p?.metric_kind === "percent" ? "%" : "";
  return `${t.value}${unit}`;
}

function describeObserved(p, c) {
  if (!c) return "—";
  const v = c.observed_value || {};
  if (p?.metric_kind === "binary") return v.value ? "Yes" : "No";
  if (p?.metric_kind === "text") return v.value ? String(v.value) : "—";
  if (v.value === undefined || v.value === null) return "—";
  const unit = v.unit ? ` ${v.unit}` : p?.metric_kind === "percent" ? "%" : "";
  return `${v.value}${unit}`;
}

function isOverdue(p) {
  if (!p?.check_at) return false;
  const d = new Date(p.check_at);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now() && !p.latest_check;
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function DecisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const agentDock = useAgentDock();

  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  // Intelligence state
  const [predictions, setPredictions] = useState([]);
  const [retros, setRetros] = useState([]);
  const [twins, setTwins] = useState([]);
  const [drift, setDrift] = useState(null);

  // GitHub linking
  const [prLinks, setPrLinks] = useState([]);
  const [showPrPicker, setShowPrPicker] = useState(false);

  // Modals / inline forms
  const [showAddPrediction, setShowAddPrediction] = useState(false);
  const [showAddRetro, setShowAddRetro] = useState(false);
  const [logOutcomeFor, setLogOutcomeFor] = useState(null);
  const [twinPremise, setTwinPremise] = useState("");
  const [busy, setBusy] = useState(false);

  // Agent dock context — uses decision-reviewer specialist
  useAgentContextHint(
    decision
      ? {
          kind: "decision",
          label: `Decision · ${decision.title || `#${id}`}`,
          goalPrefix: `Decision "${decision.title || `#${id}`}" (status: ${decision.status || "unknown"}) — `,
          profile_slug: "decision-reviewer",
        }
      : null
  );

  // ─── data ────────────────────────────────────────────────────────────────

  const fetchDecision = useCallback(async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/`);
      setDecision(res.data?.data || res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load decision");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchIntelligence = useCallback(async () => {
    try {
      const [predRes, retroRes, twinRes, driftRes] = await Promise.allSettled([
        api.get(`/api/decisions/${id}/predictions/`),
        api.get(`/api/decisions/${id}/retrospectives/`),
        api.get(`/api/decisions/${id}/twins/`),
        api.get(`/api/decisions/${id}/drift/`),
      ]);
      if (predRes.status === "fulfilled") setPredictions(predRes.value.data?.results || []);
      if (retroRes.status === "fulfilled") setRetros(retroRes.value.data?.results || []);
      if (twinRes.status === "fulfilled") setTwins(twinRes.value.data?.results || []);
      if (driftRes.status === "fulfilled") setDrift(driftRes.value.data || null);
    } catch (_) {}
  }, [id]);

  const fetchPrLinks = useCallback(async () => {
    try {
      const res = await api.get(`/api/decisions/${id}/github/links/`);
      setPrLinks(res.data?.results || []);
    } catch (_) {
      setPrLinks([]);
    }
  }, [id]);

  useEffect(() => {
    fetchDecision();
    fetchIntelligence();
    fetchPrLinks();
  }, [fetchDecision, fetchIntelligence, fetchPrLinks]);

  const handleUnlinkPr = async (linkId) => {
    if (!window.confirm("Remove this PR link from the decision?")) return;
    try {
      await api.delete(`/api/decisions/${id}/github/links/${linkId}/`);
      setPrLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Could not unlink PR");
    }
  };

  // ─── status change ──────────────────────────────────────────────────────

  const handleStatusChange = async (next) => {
    if (!decision || decision.status === next) return;
    try {
      await api.put(`/api/decisions/${id}/`, { status: next });
      toast.success?.(`Status updated to ${next.replace(/_/g, " ")}`);
      await fetchDecision();
    } catch (err) {
      toast.error?.(err?.response?.data?.detail || "Could not update status");
    }
  };

  // ─── prediction / outcome / retro / twin handlers ───────────────────────

  const handleAddPrediction = async (form) => {
    setBusy(true);
    try {
      await api.post(`/api/decisions/${id}/predictions/`, form);
      toast.success?.("Prediction logged");
      setShowAddPrediction(false);
      await Promise.all([fetchIntelligence()]);
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Could not save prediction");
    } finally {
      setBusy(false);
    }
  };

  const handleLogOutcome = async (predictionId, payload) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/api/decisions/predictions/${predictionId}/checks/`, payload);
      toast.success?.("Outcome logged");
      if (data?.auto_opened_retrospective_id) {
        toast.success?.("Drifted off track — retrospective auto-opened");
      }
      setLogOutcomeFor(null);
      await fetchIntelligence();
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Could not log outcome");
    } finally {
      setBusy(false);
    }
  };

  const handleAddRetro = async (form) => {
    setBusy(true);
    try {
      await api.post(`/api/decisions/${id}/retrospectives/`, form);
      toast.success?.("Retrospective opened");
      setShowAddRetro(false);
      await fetchIntelligence();
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Could not open retrospective");
    } finally {
      setBusy(false);
    }
  };

  const handleRunTwin = async () => {
    const premise = twinPremise.trim();
    if (!premise) return;
    setBusy(true);
    try {
      await api.post(`/api/decisions/${id}/twins/`, { counterfactual_premise: premise });
      toast.success?.("Twin queued — agent is analyzing");
      setTwinPremise("");
      await fetchIntelligence();
    } catch (err) {
      toast.error?.(err?.response?.data?.error || "Could not start twin");
    } finally {
      setBusy(false);
    }
  };

  // Poll for in-flight twins so their analysis shows up as the agent finishes.
  useEffect(() => {
    const pending = twins.filter((t) => t.status === "queued" || t.status === "running");
    if (!pending.length) return undefined;
    const timer = setTimeout(() => fetchIntelligence(), 4000);
    return () => clearTimeout(timer);
  }, [twins, fetchIntelligence]);

  // ─── derived ────────────────────────────────────────────────────────────

  const overdueCount = useMemo(() => predictions.filter(isOverdue).length, [predictions]);
  const headlineBand = drift?.headline_band || "no_outcomes";
  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "predictions", label: "Predictions", count: predictions.length },
      { id: "twins", label: "Twin runs", count: twins.length },
      { id: "retros", label: "Retrospectives", count: retros.length },
      { id: "pulls", label: "Pull requests", count: prLinks.length },
    ],
    [predictions.length, twins.length, retros.length, prLinks.length]
  );

  // ─── render ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading decision…</div>;
  }
  if (!decision) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Decision not found">
          {error || "We couldn't find that decision."}
        </SectionMessage>
      </div>
    );
  }

  return (
    <div className="di">
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "24px 32px 0" }}>
        <IconButton icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />} label="Back" onClick={() => navigate(-1)} />
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Decisions", to: "/decisions" },
            { label: decision.title || `#${id}` },
          ]}
        />
      </div>

      <div style={{ padding: "0 32px" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {decision.title}
              <Lozenge variant={statusVariant(decision.status)}>{decision.status?.replace(/_/g, " ") || "unknown"}</Lozenge>
              {decision.impact_level ? <Lozenge variant={impactVariant(decision.impact_level)}>{decision.impact_level} impact</Lozenge> : null}
            </span>
          }
          subtitle={decision.description ? decision.description.slice(0, 220) : ""}
          actions={
            <>
              <Button
                appearance="subtle"
                iconBefore={<BoltIcon style={{ width: 14, height: 14 }} />}
                onClick={() => agentDock.open()}
                title="Ask the agent about this decision (⌘J)"
              >
                Ask Agent
              </Button>
              <StatusSelect status={decision.status} onChange={handleStatusChange} />
            </>
          }
          tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
          style={{ padding: "0", marginTop: 12, background: "transparent" }}
        />

        {/* Drift headline — always visible across tabs to keep moat features front-and-center */}
        {predictions.length > 0 ? <DriftHeadline band={headlineBand} drift={drift} /> : null}
        {overdueCount > 0 ? (
          <SectionMessage
            tone="warning"
            title={`${overdueCount} prediction${overdueCount === 1 ? "" : "s"} need an outcome check`}
            style={{ marginTop: 12 }}
            actions={
              <Button appearance="subtle" size="sm" onClick={() => setTab("predictions")}>
                Log outcomes
              </Button>
            }
          >
            The check-in date has passed without a logged observation. Capture reality while context is fresh.
          </SectionMessage>
        ) : null}
      </div>

      <div className="di-grid" style={{ padding: "16px 32px 32px" }}>
        <section style={{ minWidth: 0 }}>
          {tab === "overview" ? (
            <OverviewTab decision={decision} predictions={predictions} retros={retros} />
          ) : null}
          {tab === "predictions" ? (
            <PredictionsTab
              predictions={predictions}
              onAdd={() => setShowAddPrediction(true)}
              onLogOutcome={(pid) => setLogOutcomeFor(pid)}
              logOutcomeFor={logOutcomeFor}
              onCancelOutcome={() => setLogOutcomeFor(null)}
              onSubmitOutcome={handleLogOutcome}
              busy={busy}
            />
          ) : null}
          {tab === "twins" ? (
            <TwinsTab
              twins={twins}
              premise={twinPremise}
              setPremise={setTwinPremise}
              onRun={handleRunTwin}
              busy={busy}
            />
          ) : null}
          {tab === "retros" ? (
            <RetrospectivesTab
              retros={retros}
              onAdd={() => setShowAddRetro(true)}
            />
          ) : null}
          {tab === "pulls" ? (
            <PullRequestsTab
              links={prLinks}
              onLink={() => setShowPrPicker(true)}
              onUnlink={handleUnlinkPr}
            />
          ) : null}
        </section>

        <aside className="di-side">
          <DetailCard decision={decision} />
        </aside>
      </div>

      {showAddPrediction ? (
        <Modal title="Add a predicted outcome" onClose={() => setShowAddPrediction(false)}>
          <AddPredictionForm
            onSubmit={handleAddPrediction}
            onCancel={() => setShowAddPrediction(false)}
            busy={busy}
          />
        </Modal>
      ) : null}

      {showAddRetro ? (
        <Modal title="Open a retrospective" onClose={() => setShowAddRetro(false)}>
          <AddRetrospectiveForm
            onSubmit={handleAddRetro}
            onCancel={() => setShowAddRetro(false)}
            busy={busy}
          />
        </Modal>
      ) : null}

      {showPrPicker ? (
        <GitHubPRPicker
          decisionId={id}
          onClose={() => setShowPrPicker(false)}
          onLinked={(link) => {
            setPrLinks((prev) => [link, ...prev.filter((l) => l.id !== link.id)]);
            toast.success?.(`Linked ${link.repo.full_name} #${link.pr_number}`);
          }}
        />
      ) : null}
    </div>
  );
}

// ─── header pieces ──────────────────────────────────────────────────────────

function StatusSelect({ status, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Button
        appearance="default"
        iconAfter={<ChevronDownIcon style={{ width: 12, height: 12 }} />}
        onClick={() => setOpen((v) => !v)}
      >
        Move to…
      </Button>
      {open ? (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div className="di-statusmenu">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="di-statusmenu-row"
                disabled={opt.value === status}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
              >
                <Lozenge variant={opt.variant}>{opt.label}</Lozenge>
                {opt.value === status ? <CheckCircleIcon style={{ width: 14, height: 14, color: "var(--g400)" }} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DriftHeadline({ band, drift }) {
  const meta = DRIFT_BAND_META[band] || DRIFT_BAND_META.unknown;
  const counts = (drift?.predictions || []).reduce(
    (acc, p) => {
      const b = p.latest_check?.drift_band || "unknown";
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    },
    {}
  );
  return (
    <div className={`di-drift di-drift--${band}`}>
      <div className="di-drift-bar">
        <div className={`di-drift-fill di-drift-fill--${band}`} />
      </div>
      <div className="di-drift-meta">
        <span className="di-drift-tag" style={{ background: `${meta.color}1f`, color: meta.color }}>
          <ChartBarIcon /> {meta.label}
        </span>
        <span className="di-drift-counts">
          {Object.entries(counts).map(([key, count]) => {
            const m = DRIFT_BAND_META[key] || DRIFT_BAND_META.unknown;
            return (
              <span key={key} className="di-drift-count">
                <span className="di-drift-dot" style={{ background: m.color }} />
                {m.label}: {count}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}

// ─── overview tab ───────────────────────────────────────────────────────────

function OverviewTab({ decision, predictions, retros }) {
  const latestLesson = retros[0];
  const informedBy = Array.isArray(decision.informed_by_decisions) ? decision.informed_by_decisions : [];
  return (
    <div className="di-overview">
      {informedBy.length > 0 ? (
        <PanelCard title="Informed by" accent="violet">
          <p className="di-informed-text">
            This decision was drafted after acknowledging lessons from{" "}
            <strong>{informedBy.length}</strong> past decision{informedBy.length === 1 ? "" : "s"}:
          </p>
          <div className="di-informed-list">
            {informedBy.map((pid) => (
              <Link key={pid} to={`/decisions/${pid}`} className="di-informed-chip">
                <LightBulbIcon />
                #{pid}
              </Link>
            ))}
          </div>
        </PanelCard>
      ) : null}
      {decision.description ? (
        <PanelCard title="Description">
          <div className="di-md">
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{decision.description}</ReactMarkdown>
          </div>
        </PanelCard>
      ) : null}
      {decision.rationale ? (
        <PanelCard title="Rationale">
          <div className="di-md">
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{decision.rationale}</ReactMarkdown>
          </div>
        </PanelCard>
      ) : null}
      {decision.if_this_fails ? (
        <PanelCard title="If this fails…">
          <div className="di-md">
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{decision.if_this_fails}</ReactMarkdown>
          </div>
        </PanelCard>
      ) : null}
      {predictions.length > 0 ? (
        <PanelCard title="At a glance">
          <ul className="di-glance">
            {predictions.slice(0, 4).map((p) => {
              const band = p.latest_check?.drift_band || "unknown";
              const meta = DRIFT_BAND_META[band] || DRIFT_BAND_META.unknown;
              return (
                <li key={p.id}>
                  <span className="di-glance-dim">{p.dimension}</span>
                  <span className="di-glance-target">target: {describeTarget(p)}</span>
                  <span className="di-glance-band" style={{ color: meta.color }}>
                    <span className="di-drift-dot" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </PanelCard>
      ) : null}
      {latestLesson ? (
        <PanelCard
          title="Latest lesson"
          accent="violet"
        >
          <p className="di-lesson-text">{latestLesson.lesson || latestLesson.summary || "—"}</p>
          {latestLesson.confidence_delta !== null && latestLesson.confidence_delta !== undefined ? (
            <p className="di-lesson-meta">
              Confidence delta: <strong>{latestLesson.confidence_delta > 0 ? "+" : ""}{latestLesson.confidence_delta}</strong>
            </p>
          ) : null}
        </PanelCard>
      ) : null}
    </div>
  );
}

function PanelCard({ title, children, accent }) {
  return (
    <div className={`di-panel ${accent ? `di-panel--${accent}` : ""}`}>
      <p className="di-panel-title">{title}</p>
      <div>{children}</div>
    </div>
  );
}

// ─── predictions tab ────────────────────────────────────────────────────────

function PredictionsTab({ predictions, onAdd, onLogOutcome, logOutcomeFor, onCancelOutcome, onSubmitOutcome, busy }) {
  return (
    <div className="di-predictions">
      <div className="di-section-head">
        <div>
          <h3>Predicted outcomes</h3>
          <p>What we expected, what reality says, and what we'll do about the gap.</p>
        </div>
        <Button
          appearance="primary"
          iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
          onClick={onAdd}
        >
          Add prediction
        </Button>
      </div>

      {predictions.length === 0 ? (
        <EmptyState
          icon={<ChartBarIcon style={{ width: "100%", height: "100%" }} />}
          title="No predictions yet"
          description="Capture what you expect this decision to deliver — and the date we'll check on it."
          primaryAction={
            <Button appearance="primary" onClick={onAdd}>
              Add first prediction
            </Button>
          }
        />
      ) : (
        <ul className="di-pred-list">
          {predictions.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              expanded={logOutcomeFor === p.id}
              onLogClick={() => onLogOutcome(p.id)}
              onLogCancel={onCancelOutcome}
              onLogSubmit={(payload) => onSubmitOutcome(p.id, payload)}
              busy={busy}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PredictionCard({ prediction, expanded, onLogClick, onLogCancel, onLogSubmit, busy }) {
  const latest = prediction.latest_check;
  const band = latest?.drift_band || (isOverdue(prediction) ? "off_track" : "unknown");
  const meta = DRIFT_BAND_META[band] || DRIFT_BAND_META.unknown;
  return (
    <li className={`di-pred di-pred--${band}`}>
      <div className="di-pred-head">
        <span className="di-pred-dim">{prediction.dimension}</span>
        <span className="di-pred-band" style={{ background: `${meta.color}1f`, color: meta.color }}>
          <span className="di-drift-dot" style={{ background: meta.color }} />
          {meta.label}
        </span>
        {isOverdue(prediction) ? (
          <span className="di-pred-overdue">
            <ExclamationTriangleIcon /> overdue
          </span>
        ) : null}
      </div>
      <p className="di-pred-statement">{prediction.statement}</p>
      <div className="di-pred-grid">
        <Cell label="Target" value={describeTarget(prediction)} />
        <Cell label="Observed" value={describeObserved(prediction, latest)} />
        <Cell
          label="Drift"
          value={
            latest?.drift_pct !== null && latest?.drift_pct !== undefined
              ? `${latest.drift_pct > 0 ? "+" : ""}${latest.drift_pct.toFixed(1)}%`
              : "—"
          }
        />
        <Cell label="Check date" value={formatDate(prediction.check_at)} />
      </div>
      <div className="di-pred-actions">
        {!expanded ? (
          <Button
            appearance={isOverdue(prediction) ? "primary" : "default"}
            size="sm"
            iconBefore={<SparklesIcon style={{ width: 12, height: 12 }} />}
            onClick={onLogClick}
          >
            {latest ? "Log another observation" : "How did it go?"}
          </Button>
        ) : null}
      </div>
      {expanded ? (
        <LogOutcomeForm
          prediction={prediction}
          onCancel={onLogCancel}
          onSubmit={onLogSubmit}
          busy={busy}
        />
      ) : null}
    </li>
  );
}

function Cell({ label, value }) {
  return (
    <div className="di-cell">
      <span className="di-cell-label">{label}</span>
      <span className="di-cell-value">{value}</span>
    </div>
  );
}

function LogOutcomeForm({ prediction, onCancel, onSubmit, busy }) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e) => {
    e.preventDefault();
    let observedValue = {};
    if (prediction.metric_kind === "binary") {
      observedValue = { value: value === "yes" || value === "true" };
    } else if (prediction.metric_kind === "text") {
      observedValue = { value: value };
    } else {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return;
      }
      observedValue = { value: num };
      if (prediction.target_value?.unit) observedValue.unit = prediction.target_value.unit;
    }
    onSubmit({ observed_value: observedValue, notes: notes.trim() });
  };

  return (
    <form className="di-log-form" onSubmit={submit}>
      <p className="di-log-prompt">How did "{prediction.dimension}" actually land?</p>
      {prediction.metric_kind === "binary" ? (
        <Field label="Observed">
          <select className="atlas-input" value={value} onChange={(e) => setValue(e.target.value)} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      ) : prediction.metric_kind === "text" ? (
        <Field label="Observed">
          <input className="atlas-input" value={value} onChange={(e) => setValue(e.target.value)} required />
        </Field>
      ) : (
        <Field label={`Observed (${prediction.target_value?.unit || (prediction.metric_kind === "percent" ? "%" : "value")})`}>
          <input className="atlas-input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} required />
        </Field>
      )}
      <Field label="Notes (optional)">
        <textarea className="atlas-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What context matters for the lesson?" />
      </Field>
      <div className="di-form-actions">
        <Button appearance="subtle" onClick={onCancel} type="button">Cancel</Button>
        <Button appearance="primary" type="submit" isDisabled={busy || !value}>
          {busy ? "Saving…" : "Log outcome"}
        </Button>
      </div>
    </form>
  );
}

function AddPredictionForm({ onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({
    dimension: "",
    statement: "",
    metric_kind: "number",
    target_value_value: "",
    target_value_unit: "",
    check_at: "",
  });

  const submit = (e) => {
    e.preventDefault();
    let target = {};
    if (form.metric_kind === "binary") {
      target = { value: form.target_value_value === "yes" };
    } else if (form.metric_kind === "text") {
      target = { value: form.target_value_value };
    } else {
      const num = parseFloat(form.target_value_value);
      if (isNaN(num)) return;
      target = { value: num };
      if (form.target_value_unit.trim()) target.unit = form.target_value_unit.trim();
    }
    onSubmit({
      dimension: form.dimension.trim(),
      statement: form.statement.trim(),
      metric_kind: form.metric_kind,
      target_value: target,
      check_at: form.check_at,
    });
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Dimension" isRequired helpText="Short label, e.g. 'adoption', 'latency', 'cost savings'.">
        <input className="atlas-input" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} required autoFocus />
      </Field>
      <Field label="Statement" isRequired>
        <textarea className="atlas-input" rows={2} value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} required placeholder="What we expect to happen — be specific" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Metric kind">
          <select className="atlas-input" value={form.metric_kind} onChange={(e) => setForm({ ...form, metric_kind: e.target.value })}>
            {METRIC_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Check date" isRequired>
          <input className="atlas-input" type="date" value={form.check_at} onChange={(e) => setForm({ ...form, check_at: e.target.value })} required />
        </Field>
      </div>
      {form.metric_kind === "binary" ? (
        <Field label="Target" isRequired>
          <select className="atlas-input" value={form.target_value_value} onChange={(e) => setForm({ ...form, target_value_value: e.target.value })} required>
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      ) : form.metric_kind === "text" ? (
        <Field label="Target" isRequired>
          <input className="atlas-input" value={form.target_value_value} onChange={(e) => setForm({ ...form, target_value_value: e.target.value })} required />
        </Field>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Target value" isRequired>
            <input className="atlas-input" type="number" step="any" value={form.target_value_value} onChange={(e) => setForm({ ...form, target_value_value: e.target.value })} required />
          </Field>
          <Field label="Unit (optional)">
            <input className="atlas-input" value={form.target_value_unit} onChange={(e) => setForm({ ...form, target_value_unit: e.target.value })} placeholder={form.metric_kind === "percent" ? "%" : "e.g. ms, $/mo"} />
          </Field>
        </div>
      )}
      <div className="di-form-actions">
        <Button appearance="subtle" type="button" onClick={onCancel}>Cancel</Button>
        <Button appearance="primary" type="submit" isDisabled={busy}>
          {busy ? "Saving…" : "Add prediction"}
        </Button>
      </div>
    </form>
  );
}

// ─── twins tab ──────────────────────────────────────────────────────────────

function TwinsTab({ twins, premise, setPremise, onRun, busy }) {
  return (
    <div className="di-twins">
      <div className="di-twin-composer">
        <div className="di-twin-mark">
          <SparklesIcon />
        </div>
        <div className="di-twin-body">
          <p className="di-twin-title">Run a counterfactual</p>
          <p className="di-twin-sub">
            Ask the agent: <em>"What if we'd chosen differently?"</em> It will compare
            the chosen path to your premise using workspace evidence, and write a
            side-by-side analysis.
          </p>
          <textarea
            className="atlas-input"
            rows={3}
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="e.g. What if we'd chosen Vendor B instead, or delayed this 6 months?"
          />
          <div className="di-form-actions">
            <Button
              appearance="primary"
              onClick={onRun}
              isDisabled={busy || !premise.trim()}
              iconBefore={<SparklesIcon style={{ width: 14, height: 14 }} />}
            >
              {busy ? "Queueing…" : "Run twin"}
            </Button>
          </div>
        </div>
      </div>

      {twins.length === 0 ? null : (
        <ul className="di-twin-list">
          {twins.map((t) => <TwinCard key={t.id} twin={t} />)}
        </ul>
      )}
    </div>
  );
}

function TwinCard({ twin }) {
  const [twinDetail, setTwinDetail] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !twinDetail) {
      try {
        const { data } = await api.get(`/api/decisions/twins/${twin.id}/`);
        setTwinDetail(data);
      } catch (_) {}
    }
  };

  const data = twinDetail || twin;
  const statusTone =
    data.status === "completed" ? "success"
    : data.status === "failed" ? "removed"
    : data.status === "running" ? "inprogress"
    : "default";

  return (
    <li className={`di-twin di-twin--${data.status}`}>
      <button type="button" className="di-twin-row" onClick={toggle}>
        <span className="di-twin-row-icon">
          <SparklesIcon />
        </span>
        <span className="di-twin-row-text">
          <span className="di-twin-row-premise">{data.counterfactual_premise}</span>
          <span className="di-twin-row-meta">
            <Lozenge variant={statusTone}>{data.status}</Lozenge>
            <span>{formatDate(data.created_at)}</span>
            {data.confidence ? <span>· {data.confidence}% confidence</span> : null}
            {data.agent_run_id ? (
              <Link
                to={`/agent/${data.agent_run_id}`}
                onClick={(e) => e.stopPropagation()}
                className="di-twin-runlink"
              >
                view agent run →
              </Link>
            ) : null}
          </span>
        </span>
        <ChevronRightIcon className={`di-twin-caret ${expanded ? "is-open" : ""}`} />
      </button>
      {expanded ? (
        <div className="di-twin-detail">
          {data.analysis ? (
            <div className="di-md">
              <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{data.analysis}</ReactMarkdown>
            </div>
          ) : data.status === "running" || data.status === "queued" ? (
            <p style={{ color: "var(--app-muted)", margin: 0 }}>The agent is still working…</p>
          ) : (
            <p style={{ color: "var(--app-muted)", margin: 0 }}>No analysis returned.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

// ─── retrospectives tab ─────────────────────────────────────────────────────

function RetrospectivesTab({ retros, onAdd }) {
  return (
    <div className="di-retros">
      <div className="di-section-head">
        <div>
          <h3>Retrospectives</h3>
          <p>Lessons that compound across future similar decisions.</p>
        </div>
        <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={onAdd}>
          Open retrospective
        </Button>
      </div>
      {retros.length === 0 ? (
        <EmptyState
          icon={<LightBulbIcon style={{ width: "100%", height: "100%" }} />}
          title="No retrospectives yet"
          description="Retros get auto-opened when reality drifts off-track. You can also start one manually."
          primaryAction={<Button appearance="primary" onClick={onAdd}>Open retrospective</Button>}
        />
      ) : (
        <ul className="di-retro-list">
          {retros.map((r) => <RetroCard key={r.id} retro={r} />)}
        </ul>
      )}
    </div>
  );
}

function RetroCard({ retro }) {
  const triggerTone =
    retro.triggered_by === "drift" ? "removed"
    : retro.triggered_by === "agent" ? "moved"
    : "default";
  return (
    <li className="di-retro">
      <div className="di-retro-head">
        <Lozenge variant={triggerTone}>triggered: {retro.triggered_by}</Lozenge>
        <span className="di-retro-meta">{formatDate(retro.created_at)}</span>
        {retro.author ? (
          <span className="di-retro-author">
            <Avatar size="sm" name={retro.author.name || ""} />
            <span>{retro.author.name}</span>
          </span>
        ) : null}
      </div>
      {retro.summary ? (
        <div className="di-md di-retro-section">
          <p className="di-retro-label">Summary</p>
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{retro.summary}</ReactMarkdown>
        </div>
      ) : null}
      {retro.root_cause ? (
        <div className="di-md di-retro-section">
          <p className="di-retro-label">Root cause</p>
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{retro.root_cause}</ReactMarkdown>
        </div>
      ) : null}
      {retro.lesson ? (
        <div className="di-md di-retro-section di-retro-lesson">
          <p className="di-retro-label">Lesson</p>
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{retro.lesson}</ReactMarkdown>
        </div>
      ) : null}
      {retro.tags?.length ? (
        <div className="di-retro-tags">
          {retro.tags.map((t) => <Lozenge key={t}>{t}</Lozenge>)}
        </div>
      ) : null}
      {retro.confidence_delta !== null && retro.confidence_delta !== undefined ? (
        <p className="di-retro-confidence">
          Confidence delta on similar future decisions:{" "}
          <strong style={{ color: retro.confidence_delta > 0 ? "var(--g500)" : retro.confidence_delta < 0 ? "var(--r500)" : "var(--app-muted)" }}>
            {retro.confidence_delta > 0 ? "+" : ""}{retro.confidence_delta}
          </strong>
        </p>
      ) : null}
    </li>
  );
}

function PullRequestsTab({ links, onLink, onUnlink }) {
  return (
    <div className="di-pulls">
      <div className="di-section-head">
        <div>
          <h3>Pull requests</h3>
          <p>Structured links to the PRs that implement this decision. Click <strong>Link a PR</strong> to pick one from a connected repo.</p>
        </div>
        <Button appearance="primary" iconBefore={<LinkIcon style={{ width: 14, height: 14 }} />} onClick={onLink}>
          Link a PR
        </Button>
      </div>
      {links.length === 0 ? (
        <EmptyState
          icon={<LinkIcon style={{ width: "100%", height: "100%" }} />}
          title="No PRs linked yet"
          description="Connect the GitHub App on /integrations/github, then come back here and pick a PR. Status, author, and merge state will sync automatically."
          primaryAction={<Button appearance="primary" onClick={onLink}>Link a PR</Button>}
        />
      ) : (
        <ul className="di-pr-list">
          {links.map((l) => (
            <li key={l.id} className="di-pr-card">
              <div className="di-pr-meta">
                <span className="di-pr-number">{l.repo?.full_name}<span className="di-pr-hash">#{l.pr_number}</span></span>
                <Lozenge variant={l.state === "merged" ? "moved" : l.state === "closed" ? "default" : "success"}>
                  {l.state}
                </Lozenge>
                {l.head_branch ? (
                  <span className="di-pr-branch">
                    {l.head_branch} → {l.base_branch}
                  </span>
                ) : null}
              </div>
              <a className="di-pr-title" href={l.html_url} target="_blank" rel="noopener noreferrer">
                {l.title}
              </a>
              <div className="di-pr-foot">
                {l.author_avatar_url ? (
                  <img className="di-pr-avatar" src={l.author_avatar_url} alt={l.author_login} />
                ) : null}
                <span>{l.author_login || "unknown"}</span>
                {l.linked_by ? (
                  <>
                    <span className="di-pr-dot" />
                    <span>linked by {l.linked_by}</span>
                  </>
                ) : null}
                {l.linked_at ? (
                  <>
                    <span className="di-pr-dot" />
                    <span>{formatDate(l.linked_at)}</span>
                  </>
                ) : null}
                <button
                  type="button"
                  className="di-pr-unlink"
                  onClick={() => onUnlink(l.id)}
                  aria-label="Unlink PR"
                  title="Unlink"
                >
                  <XMarkIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddRetrospectiveForm({ onSubmit, onCancel, busy }) {
  const [form, setForm] = useState({ summary: "", root_cause: "", lesson: "", confidence_delta: 0, tags: "" });
  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      triggered_by: "manual",
      summary: form.summary,
      root_cause: form.root_cause,
      lesson: form.lesson,
      confidence_delta: form.confidence_delta === "" ? null : Number(form.confidence_delta),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Summary" helpText="What happened.">
        <textarea className="atlas-input" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} autoFocus />
      </Field>
      <Field label="Root cause" helpText="Why it happened.">
        <textarea className="atlas-input" rows={3} value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} />
      </Field>
      <Field label="Lesson" helpText="The takeaway to apply to similar future decisions.">
        <textarea className="atlas-input" rows={3} value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Confidence delta" helpText="−10 to +10. Does this raise or lower our confidence in similar future calls?">
          <input className="atlas-input" type="number" min="-10" max="10" value={form.confidence_delta} onChange={(e) => setForm({ ...form, confidence_delta: e.target.value })} />
        </Field>
        <Field label="Tags (comma-separated)">
          <input className="atlas-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vendor-choice, scaling" />
        </Field>
      </div>
      <div className="di-form-actions">
        <Button appearance="subtle" type="button" onClick={onCancel}>Cancel</Button>
        <Button appearance="primary" type="submit" isDisabled={busy}>{busy ? "Saving…" : "Open retrospective"}</Button>
      </div>
    </form>
  );
}

// ─── side panel ─────────────────────────────────────────────────────────────

function DetailCard({ decision }) {
  return (
    <div className="di-detail">
      <p className="di-detail-title">Details</p>
      <DetailRow label="Decision maker" value={
        decision.decision_maker ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Avatar size="sm" name={decision.decision_maker.full_name || decision.decision_maker_name || ""} />
            <span>{decision.decision_maker.full_name || decision.decision_maker_name || decision.decision_maker.email || "—"}</span>
          </span>
        ) : "—"
      } />
      <DetailRow label="Status" value={<Lozenge variant={statusVariant(decision.status)}>{decision.status?.replace(/_/g, " ")}</Lozenge>} />
      <DetailRow label="Impact" value={<Lozenge variant={impactVariant(decision.impact_level)}>{decision.impact_level || "—"}</Lozenge>} />
      {decision.confidence_level ? (
        <DetailRow label="Confidence" value={<span>{decision.confidence_level}%</span>} />
      ) : null}
      <DetailRow label="Created" value={formatDate(decision.created_at)} />
      {Array.isArray(decision.stakeholders) && decision.stakeholders.length ? (
        <div style={{ marginTop: 12 }}>
          <p className="di-detail-label">Stakeholders</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {decision.stakeholders.slice(0, 8).map((s) => (
              <span key={s.id || s.email} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--app-text)" }}>
                <Avatar size="sm" name={s.full_name || s.name || s.email || ""} />
                <span>{s.full_name || s.name || s.email}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="di-detail-row">
      <span className="di-detail-label">{label}</span>
      <span className="di-detail-value">{value}</span>
    </div>
  );
}

// ─── modal shell ────────────────────────────────────────────────────────────

function Modal({ children, onClose, title, width = 540 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} className="di-modal-backdrop" />
      <div role="dialog" aria-modal="true" className="di-modal" style={{ width }}>
        <div className="di-modal-head">
          <h2>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div className="di-modal-body">{children}</div>
      </div>
    </>
  );
}
