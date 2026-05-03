import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  RectangleGroupIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeList(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function fmtDate(value) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(value) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function askUrl(prompt) {
  return `/ask?q=${encodeURIComponent(prompt)}&autorun=1`;
}

function useWorkspaceUi() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  return { darkMode, palette, ui };
}

function AIActionLink({ prompt, palette, ui, children = "Ask AI" }) {
  return (
    <Link to={askUrl(prompt)} style={{ ...ui.secondaryButton, textDecoration: "none", color: palette.text }} className="ui-btn-polish ui-focus-ring">
      <SparklesIcon style={{ width: 15, height: 15 }} /> {children}
    </Link>
  );
}

function Metric({ icon: Icon, label, value, helper, tone, palette }) {
  return (
    <article className="ui-card-lift ui-smooth" style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 18, padding: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: `${tone || palette.info}18`, color: tone || palette.info }}>
          <Icon style={{ width: 18, height: 18 }} />
        </span>
        <strong style={{ fontSize: 26, lineHeight: 1, color: palette.text }}>{value}</strong>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: palette.muted }}>{label}</p>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: palette.muted }}>{helper}</p>
      </div>
    </article>
  );
}

function StatusPill({ value, palette }) {
  const normalized = String(value || "open").replaceAll("_", " ");
  const tone = normalized.includes("high") || normalized.includes("overdue") ? palette.danger : normalized.includes("medium") ? palette.warn : palette.info;
  return (
    <span style={{ display: "inline-flex", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800, textTransform: "capitalize", color: tone, background: `${tone}15`, border: `1px solid ${tone}30` }}>
      {normalized}
    </span>
  );
}

function DataRow({ title, meta, href, right, palette }) {
  const content = (
    <article style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 16, padding: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
        <strong style={{ color: palette.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</strong>
        <span style={{ color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>{meta}</span>
      </div>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </article>
  );
  if (!href) return content;
  return <Link to={href} style={{ textDecoration: "none" }}>{content}</Link>;
}

function ErrorBanner({ message, palette }) {
  if (!message) return null;
  return <div style={{ border: `1px solid ${palette.danger}35`, background: `${palette.danger}12`, color: palette.danger, borderRadius: 16, padding: 12, fontSize: 13 }}>{message}</div>;
}

function getJourneyMapData(journey) {
  const data = journey?.map_data && typeof journey.map_data === "object" ? journey.map_data : {};
  return {
    stages: Array.isArray(data.stages) && data.stages.length ? data.stages : [
      { name: "Discover", owner: "Team", status: "open", notes: "" },
      { name: "Decide", owner: "Team", status: "open", notes: "" },
      { name: "Deliver", owner: "Team", status: "open", notes: "" },
    ],
    risks: Array.isArray(data.risks) ? data.risks : [],
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
}

const DASHBOARD_WIDGET_TYPES = [
  { type: "briefing", label: "Workspace briefing", helper: "What changed, what needs attention, and suggested next moves." },
  { type: "business", label: "Business execution", helper: "Goals, tasks, meetings, and recent operating activity." },
  { type: "timeline", label: "Recent activity", helper: "A compact timeline of workspace changes." },
  { type: "team_health", label: "Team health", helper: "Load, sentiment, and burnout pressure." },
  { type: "service_desk", label: "Service desk", helper: "Open requests, overdue items, and queue pressure." },
  { type: "reports", label: "Delivery reporting", helper: "Sprint, velocity, and burndown status." },
];

function normalizeDashboardWidgets(widgets) {
  if (!Array.isArray(widgets)) return [];
  return widgets.map((widget, index) => ({
    id: widget.id || widget.local_id || `widget-${index}-${widget.type || widget.widget_type || "metric"}`,
    type: widget.type || widget.widget_type || "briefing",
    title: widget.title || DASHBOARD_WIDGET_TYPES.find((item) => item.type === (widget.type || widget.widget_type))?.label || "Dashboard widget",
    width: widget.width || 1,
    height: widget.height || 1,
    config: widget.config || {},
  }));
}

function triageServiceRequest(title, description) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const hasAny = (terms) => terms.some((term) => text.includes(term));

  let suggested_request_type = "general";
  if (hasAny(["access", "permission", "login", "password", "account", "invite", "sso"])) suggested_request_type = "access";
  else if (hasAny(["down", "outage", "incident", "broken", "unavailable", "cannot work", "blocked for everyone"])) suggested_request_type = "incident";
  else if (hasAny(["bug", "error", "crash", "failed", "failure", "regression", "not working"])) suggested_request_type = "bug";
  else if (hasAny(["change", "update", "modify", "migration", "rollout", "release"])) suggested_request_type = "change";
  else if (hasAny(["request", "setup", "provision", "configure", "install"])) suggested_request_type = "service";

  let suggested_priority = "medium";
  if (hasAny(["urgent", "critical", "outage", "security", "breach", "production", "blocked for everyone", "customer down"])) suggested_priority = "highest";
  else if (hasAny(["blocked", "deadline", "today", "asap", "major", "many users", "high impact"])) suggested_priority = "high";
  else if (hasAny(["minor", "low", "when possible", "nice to have"])) suggested_priority = "low";

  let risk_status = "watch";
  if (suggested_priority === "highest" || suggested_request_type === "incident") risk_status = "urgent";
  else if (suggested_priority === "high" || suggested_request_type === "bug") risk_status = "elevated";

  const next_actions = [
    "Confirm the affected user, team, or customer group.",
    "Capture reproduction steps, screenshots, logs, or affected URLs.",
    risk_status === "urgent" ? "Assign an owner immediately and post a status update." : "Assign an owner and agree on the next checkpoint.",
  ];
  if (suggested_request_type === "access") next_actions[1] = "Confirm the exact app, workspace, role, and access level needed.";
  if (suggested_request_type === "change") next_actions[1] = "Confirm rollout timing, impacted systems, and rollback plan.";

  const confidence = Math.min(92, 58 + (title ? 12 : 0) + (description.length > 80 ? 14 : 0) + (risk_status !== "watch" ? 8 : 0));

  return {
    risk_status,
    confidence,
    suggested_request_type,
    suggested_priority,
    answer: `Classified as ${suggested_request_type} with ${suggested_priority} priority because the request language indicates ${risk_status === "urgent" ? "urgent impact" : risk_status === "elevated" ? "elevated delivery risk" : "standard triage risk"}.`,
    next_actions,
  };
}

export function BusinessJourneys() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [journeys, setJourneys] = useState([]);
  const [form, setForm] = useState({ title: "", objective: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadJourneys = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/business/journeys/");
      setJourneys(normalizeList(response.data));
    } catch (requestError) {
      setError("Journey maps could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourneys();
  }, []);

  const createJourney = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/business/journeys/", {
        title: form.title,
        objective: form.objective,
        map_data: {
          stages: [
            { name: "Discover", owner: "Team", status: "open" },
            { name: "Decide", owner: "Team", status: "open" },
            { name: "Deliver", owner: "Team", status: "open" },
          ],
        },
      });
      setForm({ title: "", objective: "" });
      loadJourneys();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Journey map could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Business Journey Maps"
        title="Map work from signal to outcome"
        description="Turn customer, product, and operating workflows into trackable maps instead of leaving them as a redirected promise."
        stats={[
          { label: "Journey maps", value: journeys.length, helper: "Live maps in this workspace", tone: palette.info },
          { label: "Default stages", value: 3, helper: "Discover, decide, deliver", tone: palette.accent },
          { label: "AI-ready", value: "Yes", helper: "Objective and stages can feed Ask Recall", tone: palette.success },
        ]}
        actions={<AIActionLink palette={palette} ui={ui} prompt="Review our journey maps and suggest the next operational improvement.">Ask about journeys</AIActionLink>}
      />
      <ErrorBanner message={error} palette={palette} />
      <div style={ui.responsiveSplit}>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Create" title="New journey map" description="Capture the flow the team needs to improve.">
          <form onSubmit={createJourney} style={{ display: "grid", gap: 10 }}>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Journey title" style={ui.input} />
            <textarea value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} placeholder="Objective, friction, or outcome" rows={4} style={{ ...ui.input, resize: "vertical" }} />
            <button disabled={saving} style={ui.primaryButton} className="ui-btn-polish ui-focus-ring">
              <PlusIcon style={{ width: 15, height: 15 }} /> {saving ? "Creating..." : "Create journey"}
            </button>
          </form>
        </WorkspacePanel>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Maps" title="Journey library" description="Open maps that already exist in this organization.">
          {loading ? <p style={{ margin: 0, color: palette.muted }}>Loading journeys...</p> : null}
          {!loading && journeys.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No journey maps yet" description="Create the first map to make this surface useful." /> : null}
          {journeys.map((journey) => (
            <DataRow key={journey.id} href={`/business/journeys/${journey.id}`} title={journey.title} meta={journey.objective || "No objective added"} right={<StatusPill value={`${(journey.map_data?.stages || []).length || 0} stages`} palette={palette} />} palette={palette} />
          ))}
        </WorkspacePanel>
      </div>
    </div>
  );
}

export function JourneyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [journey, setJourney] = useState(null);
  const [form, setForm] = useState({ title: "", objective: "", stages: [], risks: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadJourney = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/business/journeys/${id}/`);
      const data = getJourneyMapData(response.data);
      setJourney(response.data);
      setForm({
        title: response.data.title || "",
        objective: response.data.objective || "",
        stages: data.stages,
        risks: data.risks,
        actions: data.actions,
      });
    } catch (requestError) {
      setError("Journey map could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
  }, [id]);

  const updateStage = (index, field, value) => {
    setForm((current) => ({
      ...current,
      stages: current.stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, [field]: value } : stage)),
    }));
  };

  const addStage = () => {
    setForm((current) => ({
      ...current,
      stages: [...current.stages, { name: "New stage", owner: "Team", status: "open", notes: "" }],
    }));
  };

  const removeStage = (index) => {
    setForm((current) => ({
      ...current,
      stages: current.stages.filter((_, stageIndex) => stageIndex !== index),
    }));
  };

  const updateListItem = (key, index, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addListItem = (key, fallback) => {
    setForm((current) => ({
      ...current,
      [key]: [...current[key], fallback],
    }));
  };

  const removeListItem = (key, index) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveJourney = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        objective: form.objective,
        map_data: {
          stages: form.stages.filter((stage) => String(stage.name || "").trim()),
          risks: form.risks.filter((risk) => String(risk || "").trim()),
          actions: form.actions.filter((action) => String(action || "").trim()),
        },
      };
      const response = await api.put(`/api/business/journeys/${id}/`, payload);
      setJourney({ ...(journey || {}), ...payload, updated_at: response.data?.updated_at || new Date().toISOString() });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Journey map could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const deleteJourney = async () => {
    if (!window.confirm("Delete this journey map?")) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/api/business/journeys/${id}/`);
      navigate("/business/journeys");
    } catch (requestError) {
      setError("Journey map could not be deleted.");
      setSaving(false);
    }
  };

  const completeStages = form.stages.filter((stage) => String(stage.status || "").toLowerCase() === "done").length;

  return (
    <form onSubmit={saveJourney} style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Journey Map"
        title={loading ? "Loading journey" : form.title || "Untitled journey"}
        description={form.objective || "Shape the operating flow, owners, risks, and next actions behind this journey."}
        stats={[
          { label: "Stages", value: form.stages.length, helper: `${completeStages} marked done`, tone: palette.info },
          { label: "Risks", value: form.risks.length, helper: "Tracked blockers or concerns", tone: form.risks.length ? palette.warn : palette.success },
          { label: "Actions", value: form.actions.length, helper: "Next moves to execute", tone: palette.accent },
        ]}
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AIActionLink palette={palette} ui={ui} prompt={`Review the journey map "${form.title}" with objective "${form.objective}". Suggest missing stages, risks, and next actions.`}>Ask journey AI</AIActionLink>
            <Link to="/business/journeys" style={{ ...ui.secondaryButton, textDecoration: "none" }} className="ui-btn-polish ui-focus-ring">Back to journeys</Link>
          </div>
        }
      />

      <ErrorBanner message={error} palette={palette} />
      {loading ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="Loading journey" description="Preparing this journey map." /> : null}

      {!loading ? (
        <>
          <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Brief" title="Journey definition" description="Name the flow and the outcome this map should make easier.">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Journey title" style={ui.input} />
            <textarea value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} placeholder="Objective, friction, customer moment, or operating outcome" rows={4} style={{ ...ui.input, resize: "vertical" }} />
          </WorkspacePanel>

          <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Flow" title="Stages" description="Keep each stage concrete enough that an owner can move it forward." action={<button type="button" onClick={addStage} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><PlusIcon style={{ width: 14, height: 14 }} /> Add stage</button>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {form.stages.map((stage, index) => (
                <article key={`${stage.name}-${index}`} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 18, padding: 14, display: "grid", gap: 10 }}>
                  <input value={stage.name || ""} onChange={(event) => updateStage(index, "name", event.target.value)} placeholder="Stage name" style={ui.input} />
                  <div style={ui.twoCol}>
                    <input value={stage.owner || ""} onChange={(event) => updateStage(index, "owner", event.target.value)} placeholder="Owner" style={ui.input} />
                    <select value={stage.status || "open"} onChange={(event) => updateStage(index, "status", event.target.value)} style={ui.input}>
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <textarea value={stage.notes || ""} onChange={(event) => updateStage(index, "notes", event.target.value)} placeholder="Notes, handoff, friction, or evidence" rows={3} style={{ ...ui.input, resize: "vertical" }} />
                  <button type="button" onClick={() => removeStage(index)} style={{ ...ui.secondaryButton, justifyContent: "center" }} className="ui-btn-polish ui-focus-ring">Remove stage</button>
                </article>
              ))}
            </div>
          </WorkspacePanel>

          <div style={ui.responsiveSplit}>
            <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Risk" title="Risks" description="Capture where the journey can stall or lose context." action={<button type="button" onClick={() => addListItem("risks", "")} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><PlusIcon style={{ width: 14, height: 14 }} /> Add risk</button>}>
              {form.risks.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No risks tracked" description="Add risks before they become hidden blockers." /> : null}
              {form.risks.map((risk, index) => (
                <div key={`risk-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                  <input value={risk} onChange={(event) => updateListItem("risks", index, event.target.value)} placeholder="Risk or blocker" style={ui.input} />
                  <button type="button" onClick={() => removeListItem("risks", index)} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring">Remove</button>
                </div>
              ))}
            </WorkspacePanel>

            <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Action" title="Next actions" description="Keep the journey connected to actual follow-through." action={<button type="button" onClick={() => addListItem("actions", "")} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><PlusIcon style={{ width: 14, height: 14 }} /> Add action</button>}>
              {form.actions.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No actions yet" description="Add the next moves that make this journey operational." /> : null}
              {form.actions.map((action, index) => (
                <div key={`action-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                  <input value={action} onChange={(event) => updateListItem("actions", index, event.target.value)} placeholder="Next action" style={ui.input} />
                  <button type="button" onClick={() => removeListItem("actions", index)} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring">Remove</button>
                </div>
              ))}
            </WorkspacePanel>
          </div>

          <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
              <button type="submit" disabled={saving} style={ui.primaryButton} className="ui-btn-polish ui-focus-ring">{saving ? "Saving..." : "Save journey"}</button>
              <button type="button" disabled={saving} onClick={deleteJourney} style={{ ...ui.secondaryButton, color: palette.danger }} className="ui-btn-polish ui-focus-ring">Delete journey</button>
            </div>
          </WorkspaceToolbar>
        </>
      ) : null}
    </form>
  );
}

export function BusinessCalendar() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [connections, setConnections] = useState([]);
  const [busy, setBusy] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [slotResult, setSlotResult] = useState(null);
  const [error, setError] = useState("");

  const windowStart = useMemo(() => new Date(), []);
  const windowEnd = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);

  const loadCalendar = async () => {
    setError("");
    try {
      const [connectionRes, busyRes, taskRes] = await Promise.all([
        api.get("/api/business/calendar/connections/").catch(() => ({ data: [] })),
        api.get("/api/business/calendar/free-busy/", { params: { start: windowStart.toISOString(), end: windowEnd.toISOString() } }).catch(() => ({ data: { busy: [] } })),
        api.get("/api/business/tasks/").catch(() => ({ data: [] })),
      ]);
      setConnections(normalizeList(connectionRes.data));
      setBusy(normalizeList(busyRes.data?.busy));
      const taskList = normalizeList(taskRes.data);
      setTasks(taskList);
      setSelectedTask((current) => current || String(taskList[0]?.id || ""));
    } catch (requestError) {
      setError("Calendar data could not be loaded.");
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const connectManual = async () => {
    setError("");
    try {
      await api.put("/api/business/calendar/connections/", { provider: "manual", is_connected: true, metadata: { source: "mvp-calendar" } });
      loadCalendar();
    } catch (requestError) {
      setError("Manual calendar connection could not be saved.");
    }
  };

  const slotTask = async () => {
    if (!selectedTask) return;
    setError("");
    try {
      const response = await api.post("/api/business/calendar/slot-task/", {
        task_id: selectedTask,
        duration_minutes: 60,
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
      });
      setSlotResult(response.data);
      loadCalendar();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Task could not be slotted.");
    }
  };

  const selectedTaskRecord = tasks.find((task) => String(task.id) === String(selectedTask));
  const scheduledTasks = tasks.filter((task) => task.scheduled_start);

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Calendar"
        title="Find time for the work"
        description="A usable scheduling surface for calendar connections, busy windows, and saved task slotting."
        stats={[
          { label: "Connections", value: connections.length, helper: "Calendar sources linked", tone: palette.info },
          { label: "Busy windows", value: busy.length, helper: "Internal and external blocks", tone: palette.warn },
          { label: "Scheduled tasks", value: scheduledTasks.length, helper: "Tasks with saved work blocks", tone: palette.accent },
        ]}
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={connectManual} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><CalendarDaysIcon style={{ width: 15, height: 15 }} /> Enable manual calendar</button>
            <AIActionLink palette={palette} ui={ui} prompt="Look at my tasks and calendar pressure. What should I schedule first this week?">Ask scheduling AI</AIActionLink>
          </div>
        }
      />
      <ErrorBanner message={error} palette={palette} />
      <div style={ui.responsiveSplit}>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Slotting" title="Schedule a task" description="Ask Knoledgr to find the next available work block this week.">
          <select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} style={ui.input}>
            <option value="">Select task</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
          <button onClick={slotTask} disabled={!selectedTask} style={ui.primaryButton} className="ui-btn-polish ui-focus-ring">
            <SparklesIcon style={{ width: 15, height: 15 }} /> Find slot
          </button>
          {slotResult ? (
            <div style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 16, padding: 12, color: palette.text, fontSize: 13 }}>
              {slotResult.scheduled ? `Saved ${selectedTaskRecord?.title || "task"} for ${fmtDateTime(slotResult.suggested_slot?.start)} to ${fmtDateTime(slotResult.suggested_slot?.end)}.` : slotResult.message}
            </div>
          ) : null}
        </WorkspacePanel>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Saved" title="Scheduled tasks" description="Task work blocks persisted by the calendar slotter.">
          {scheduledTasks.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No scheduled tasks yet" description="Use Find slot to save a work block to a task." /> : null}
          {scheduledTasks.slice(0, 8).map((task) => (
            <DataRow key={task.id} title={task.title} meta={`${fmtDateTime(task.scheduled_start)} to ${fmtDateTime(task.scheduled_end)} | Due ${fmtDate(task.due_date)}`} right={<StatusPill value={task.status} palette={palette} />} palette={palette} />
          ))}
        </WorkspacePanel>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Availability" title="Busy windows" description="This week’s calendar pressure from meetings and connected calendars.">
          {busy.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No busy windows found" description="Connect a calendar or add meetings to build availability context." /> : null}
          {busy.slice(0, 8).map((item, index) => (
            <DataRow key={`${item.start}-${index}`} title={`${fmtDate(item.start)} to ${fmtDate(item.end)}`} meta={`Source: ${item.source || "calendar"}`} palette={palette} />
          ))}
        </WorkspacePanel>
      </div>
    </div>
  );
}

export function TeamHealth() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [health, setHealth] = useState(null);
  const [burnout, setBurnout] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHealth = async () => {
      setError("");
      const [healthRes, burnoutRes] = await Promise.allSettled([
        api.get("/api/conversations/sentiment/health/?days=30"),
        api.get("/api/business/team/burnout-risk/?days=14"),
      ]);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value.data);
      if (burnoutRes.status === "fulfilled") setBurnout(burnoutRes.value.data);
      if (healthRes.status === "rejected" && burnoutRes.status === "rejected") setError("Team health data could not be loaded.");
    };
    loadHealth();
  }, []);

  const rows = burnout?.results || [];
  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Team Health"
        title="Spot load, sentiment, and execution pressure"
        description="A live team-health cockpit using conversations, reactions, meetings, and tasks."
        stats={[
          { label: "Active users", value: health?.active_users || 0, helper: "Contributors in the period", tone: palette.info },
          { label: "Decisions", value: health?.decisions_made || 0, helper: "Decisions made in 30 days", tone: palette.accent },
          { label: "High risk", value: burnout?.high_risk_count || 0, helper: "People needing load review", tone: burnout?.high_risk_count ? palette.danger : palette.success },
        ]}
        actions={<AIActionLink palette={palette} ui={ui} prompt="Review team health, load, and sentiment signals. What risks should we address first?">Ask health AI</AIActionLink>}
      />
      <ErrorBanner message={error} palette={palette} />
      <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Load" title="Burnout risk signals" description="Open tasks, overdue work, meetings, and concern reactions combined into one review queue.">
        {rows.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No risk rows yet" description="Risk appears here as team activity accumulates." /> : null}
        {rows.map((row) => (
          <DataRow
            key={row.user_id}
            title={row.name || `User ${row.user_id}`}
            meta={`${row.signals?.open_tasks || 0} open tasks, ${row.signals?.overdue_tasks || 0} overdue, ${row.signals?.meeting_hours_last_period || 0}h meetings`}
            right={<StatusPill value={`${row.risk_level} ${row.risk_score}`} palette={palette} />}
            palette={palette}
          />
        ))}
      </WorkspacePanel>
    </div>
  );
}

export function ServiceDesk() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [overview, setOverview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", request_type: "general", priority: "medium", project_id: "" });
  const [triage, setTriage] = useState(null);
  const [error, setError] = useState("");

  const loadDesk = async () => {
    setError("");
    try {
      const [overviewRes, projectRes] = await Promise.all([
        api.get("/api/agile/service-desk/"),
        api.get("/api/agile/projects/").catch(() => ({ data: [] })),
      ]);
      setOverview(overviewRes.data);
      const projectList = normalizeList(projectRes.data);
      setProjects(projectList);
      setForm((current) => ({ ...current, project_id: current.project_id || String(projectList[0]?.id || "") }));
    } catch (requestError) {
      setError("Service desk could not be loaded.");
    }
  };

  useEffect(() => {
    loadDesk();
  }, []);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setError("");
    try {
      await api.post("/api/agile/service-desk/requests/", { ...form, ai_triage: triage || undefined });
      setForm((current) => ({ ...current, title: "", description: "" }));
      setTriage(null);
      loadDesk();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Request could not be created.");
    }
  };

  const runTriage = () => {
    if (!form.title.trim() && !form.description.trim()) {
      setError("Add a title or description before running triage.");
      return;
    }
    const result = triageServiceRequest(form.title, form.description);
    setTriage(result);
    setForm((current) => ({
      ...current,
      request_type: result.suggested_request_type,
      priority: result.suggested_priority,
    }));
    setError("");
  };

  const summary = overview?.summary || {};
  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Service Desk"
        title="Capture requests without leaving the workspace"
        description="Support, access, bug, incident, and change requests now have a real queue instead of redirecting into projects."
        stats={[
          { label: "Total", value: summary.total_requests || 0, helper: "All service requests", tone: palette.info },
          { label: "Open", value: summary.open_requests || 0, helper: "Still active", tone: palette.warn },
          { label: "Overdue", value: summary.overdue || 0, helper: "Needs escalation", tone: summary.overdue ? palette.danger : palette.success },
        ]}
        actions={<AIActionLink palette={palette} ui={ui} prompt="Triage the service desk queue and recommend the highest-impact next actions.">Ask service AI</AIActionLink>}
      />
      <ErrorBanner message={error} palette={palette} />
      <div style={ui.responsiveSplit}>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Request" title="Create service request" description="Submit a queue item that becomes a labeled agile issue.">
          <form onSubmit={submitRequest} style={{ display: "grid", gap: 10 }}>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Request title" style={ui.input} />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the need, impact, and urgency" rows={4} style={{ ...ui.input, resize: "vertical" }} />
            <div style={ui.twoCol}>
              <select value={form.request_type} onChange={(event) => setForm({ ...form, request_type: event.target.value })} style={ui.input}>
                {(overview?.request_types || [{ key: "general", name: "General Support" }]).map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
              </select>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} style={ui.input}>
                {["low", "medium", "high", "highest"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} style={ui.input}>
              <option value="">Default project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" onClick={runTriage} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><SparklesIcon style={{ width: 15, height: 15 }} /> Triage request</button>
            {triage ? (
              <section style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 16, padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <StatusPill value={triage.risk_status} palette={palette} />
                  <StatusPill value={triage.suggested_request_type} palette={palette} />
                  <StatusPill value={triage.suggested_priority} palette={palette} />
                  <span style={{ color: palette.muted, fontSize: 12, fontWeight: 700 }}>{triage.confidence}% confidence</span>
                </div>
                <p style={{ margin: 0, color: palette.text, fontSize: 13, lineHeight: 1.55 }}>{triage.answer}</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: palette.muted, fontSize: 12, lineHeight: 1.6 }}>
                  {triage.next_actions.map((action) => <li key={action}>{action}</li>)}
                </ul>
              </section>
            ) : null}
            <button style={ui.primaryButton} className="ui-btn-polish ui-focus-ring"><TicketIcon style={{ width: 15, height: 15 }} /> Submit request</button>
          </form>
        </WorkspacePanel>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Queue" title="Request queue" description="The latest service-desk issues with AI triage metadata when available.">
          {(overview?.queue || []).length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No requests yet" description="Create the first service request to start the queue." /> : null}
          {(overview?.queue || []).map((item) => (
            <DataRow key={item.id} href={`/issues/${item.id}`} title={`${item.key}: ${item.title}`} meta={`${item.project} by ${item.reporter || "Unknown"} | ${fmtDate(item.updated_at)}`} right={<StatusPill value={item.ai_triage?.risk_status || item.status} palette={palette} />} palette={palette} />
          ))}
        </WorkspacePanel>
      </div>
    </div>
  );
}

export function AnalyticsOverview() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [business, setBusiness] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setError("");
      const [businessRes, briefingRes, timelineRes] = await Promise.allSettled([
        api.get("/api/business/analytics/"),
        api.get("/api/knowledge/dashboard/workspace-briefing/"),
        api.get("/api/knowledge/timeline/?days=14&page=1&per_page=8"),
      ]);
      if (businessRes.status === "fulfilled") setBusiness(businessRes.value.data);
      if (briefingRes.status === "fulfilled") setBriefing(briefingRes.value.data);
      if (timelineRes.status === "fulfilled") setTimeline(normalizeList(timelineRes.value.data?.results || timelineRes.value.data));
      if ([businessRes, briefingRes, timelineRes].every((result) => result.status === "rejected")) setError("Analytics could not be loaded.");
    };
    loadAnalytics();
  }, []);

  const summary = briefing?.summary || {};
  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Analytics"
        title="Workspace analytics"
        description={summary.headline || "A real analytics hub for business execution, workspace briefing, and recent activity."}
        stats={[
          { label: "Goals", value: business?.goals?.total || 0, helper: "Tracked outcomes", tone: palette.info },
          { label: "Tasks", value: business?.tasks?.total || 0, helper: "Business task volume", tone: palette.accent },
          { label: "Attention", value: summary.attention_count || 0, helper: "Briefing pressure points", tone: summary.attention_count ? palette.warn : palette.success },
        ]}
        actions={<AIActionLink palette={palette} ui={ui} prompt="Analyze workspace analytics and briefing signals. What changed, what is stuck, and what should we do next?">Ask analytics AI</AIActionLink>}
      />
      <ErrorBanner message={error} palette={palette} />
      <div style={ui.responsiveSplit}>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Business" title="Execution mix" description="Goals, tasks, and meetings from the business module.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Metric icon={ClipboardDocumentListIcon} label="Recent goals" value={business?.goals?.recent || 0} helper="Created this week" tone={palette.info} palette={palette} />
            <Metric icon={CalendarDaysIcon} label="Meetings" value={business?.meetings?.upcoming || 0} helper="Upcoming" tone={palette.accent} palette={palette} />
            <Metric icon={ChartBarIcon} label="Recent tasks" value={business?.tasks?.recent || 0} helper="Created this week" tone={palette.success} palette={palette} />
          </div>
        </WorkspacePanel>
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Timeline" title="Recent activity" description="Activity pulled from the unified knowledge timeline.">
          {timeline.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No activity yet" description="Activity appears here as the workspace starts moving." /> : null}
          {timeline.slice(0, 6).map((item, index) => (
            <DataRow key={item.id || index} href={item.url} title={item.title || item.summary || "Workspace activity"} meta={`${item.type || item.kind || "activity"} | ${fmtDate(item.timestamp || item.created_at || item.date)}`} palette={palette} />
          ))}
        </WorkspacePanel>
      </div>
    </div>
  );
}

export function Dashboards() {
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [dashboards, setDashboards] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const loadDashboards = async () => {
    setError("");
    try {
      const response = await api.get("/api/organizations/analytics/dashboards/");
      setDashboards(normalizeList(response.data));
    } catch (requestError) {
      setError("Dashboards could not be loaded.");
    }
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  const createDashboard = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await api.post("/api/organizations/analytics/dashboards/create/", {
        name,
        widgets: [
          { type: "briefing", title: "Workspace briefing" },
          { type: "business", title: "Business execution" },
          { type: "timeline", title: "Recent activity" },
        ],
      });
      setName("");
      loadDashboards();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Dashboard could not be created.");
    }
  };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Dashboards"
        title="Build reusable workspace views"
        description="Custom dashboards now have a real entry point, with default widgets that map to the MVP analytics stack."
        stats={[
          { label: "Dashboards", value: dashboards.length, helper: "Owned by you", tone: palette.info },
          { label: "Starter widgets", value: 3, helper: "Briefing, business, timeline", tone: palette.accent },
          { label: "Default route", value: "Live", helper: "No more redirect to reports", tone: palette.success },
        ]}
        actions={<AIActionLink palette={palette} ui={ui} prompt="Suggest a useful operating dashboard for this workspace based on current goals, tasks, briefing, and timeline activity.">Ask dashboard AI</AIActionLink>}
      />
      <ErrorBanner message={error} palette={palette} />
      <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
        <form onSubmit={createDashboard} style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dashboard name" style={{ ...ui.input, maxWidth: 360 }} />
          <button style={ui.primaryButton} className="ui-btn-polish ui-focus-ring"><RectangleGroupIcon style={{ width: 15, height: 15 }} /> Create dashboard</button>
          <Link to="/analytics" style={{ ...ui.secondaryButton, textDecoration: "none" }}><ArrowPathIcon style={{ width: 15, height: 15 }} /> Open analytics</Link>
        </form>
      </WorkspaceToolbar>
      <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Library" title="Your dashboards" description="Saved dashboard shells ready for deeper widget editing.">
        {dashboards.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No dashboards yet" description="Create a dashboard to save a reusable analytics view." /> : null}
        {dashboards.map((dashboard) => (
          <DataRow key={dashboard.id} href={`/dashboards/${dashboard.id}`} title={dashboard.name} meta={`${dashboard.is_default ? "Default" : "Custom"} | Created ${fmtDate(dashboard.created_at)}`} right={<StatusPill value={dashboard.layout || "dashboard"} palette={palette} />} palette={palette} />
        ))}
      </WorkspacePanel>
    </div>
  );
}

export function DashboardDetail() {
  const { id } = useParams();
  const { darkMode, palette, ui } = useWorkspaceUi();
  const [dashboard, setDashboard] = useState(null);
  const [form, setForm] = useState({ name: "", layout: "grid", widgets: [] });
  const [selectedType, setSelectedType] = useState(DASHBOARD_WIDGET_TYPES[0].type);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/organizations/analytics/dashboards/${id}/`);
      const widgets = normalizeDashboardWidgets(response.data?.widgets);
      setDashboard(response.data);
      setForm({
        name: response.data?.name || "",
        layout: response.data?.layout || "grid",
        widgets,
      });
    } catch (requestError) {
      setError("Dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [id]);

  const addWidget = () => {
    const definition = DASHBOARD_WIDGET_TYPES.find((item) => item.type === selectedType) || DASHBOARD_WIDGET_TYPES[0];
    setForm((current) => ({
      ...current,
      widgets: [
        ...current.widgets,
        {
          id: `local-${Date.now()}`,
          type: definition.type,
          title: definition.label,
          width: 1,
          height: 1,
          config: {},
        },
      ],
    }));
  };

  const updateWidget = (index, field, value) => {
    setForm((current) => ({
      ...current,
      widgets: current.widgets.map((widget, widgetIndex) => (widgetIndex === index ? { ...widget, [field]: value } : widget)),
    }));
  };

  const removeWidget = (index) => {
    setForm((current) => ({
      ...current,
      widgets: current.widgets.filter((_, widgetIndex) => widgetIndex !== index),
    }));
  };

  const saveDashboard = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        layout: form.layout,
        widgets: form.widgets.map((widget) => ({
          type: widget.type,
          title: widget.title,
          width: Number(widget.width) || 1,
          height: Number(widget.height) || 1,
          config: widget.config || {},
        })),
      };
      await api.put(`/api/organizations/analytics/dashboards/${id}/update/`, payload);
      setDashboard({ ...(dashboard || {}), ...payload });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Dashboard could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={saveDashboard} style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="execution"
        eyebrow="Dashboard Builder"
        title={loading ? "Loading dashboard" : form.name || "Untitled dashboard"}
        description="Shape a reusable operating view from workspace briefing, business, team health, service, and reporting widgets."
        stats={[
          { label: "Widgets", value: form.widgets.length, helper: "Cards in this view", tone: palette.info },
          { label: "Layout", value: form.layout, helper: "Saved dashboard mode", tone: palette.accent },
          { label: "AI-ready", value: "Yes", helper: "Use Ask Recall to suggest useful widgets", tone: palette.success },
        ]}
        actions={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AIActionLink palette={palette} ui={ui} prompt={`Suggest improvements for the dashboard "${form.name}" with widgets: ${form.widgets.map((widget) => widget.title).join(", ") || "none"}.`}>Ask dashboard AI</AIActionLink>
            <Link to="/dashboards" style={{ ...ui.secondaryButton, textDecoration: "none" }} className="ui-btn-polish ui-focus-ring">Back to dashboards</Link>
          </div>
        }
      />
      <ErrorBanner message={error} palette={palette} />
      {loading ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="Loading dashboard" description="Preparing the builder." /> : null}
      {!loading ? (
        <>
          <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Setup" title="Dashboard settings" description="Name the view and choose how it should be organized.">
            <div style={ui.twoCol}>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Dashboard name" style={ui.input} />
              <select value={form.layout} onChange={(event) => setForm({ ...form, layout: event.target.value })} style={ui.input}>
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </WorkspacePanel>

          <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="execution">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
              <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)} style={{ ...ui.input, width: "auto", minWidth: 240 }}>
                {DASHBOARD_WIDGET_TYPES.map((type) => <option key={type.type} value={type.type}>{type.label}</option>)}
              </select>
              <button type="button" onClick={addWidget} style={ui.secondaryButton} className="ui-btn-polish ui-focus-ring"><PlusIcon style={{ width: 14, height: 14 }} /> Add widget</button>
              <button type="submit" disabled={saving} style={ui.primaryButton} className="ui-btn-polish ui-focus-ring">{saving ? "Saving..." : "Save dashboard"}</button>
            </div>
          </WorkspaceToolbar>

          <WorkspacePanel palette={palette} darkMode={darkMode} variant="execution" eyebrow="Widgets" title="Dashboard widgets" description="Add the widgets this operating view should carry.">
            {form.widgets.length === 0 ? <WorkspaceEmptyState palette={palette} darkMode={darkMode} variant="execution" title="No widgets yet" description="Add a starter widget to make this dashboard useful." /> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {form.widgets.map((widget, index) => {
                const definition = DASHBOARD_WIDGET_TYPES.find((item) => item.type === widget.type);
                return (
                  <article key={widget.id || index} style={{ border: `1px solid ${palette.border}`, background: palette.cardAlt, borderRadius: 18, padding: 14, display: "grid", gap: 10 }}>
                    <StatusPill value={definition?.label || widget.type} palette={palette} />
                    <input value={widget.title} onChange={(event) => updateWidget(index, "title", event.target.value)} placeholder="Widget title" style={ui.input} />
                    <p style={{ margin: 0, color: palette.muted, fontSize: 12, lineHeight: 1.55 }}>{definition?.helper || "Custom dashboard widget."}</p>
                    <div style={ui.twoCol}>
                      <select value={widget.width} onChange={(event) => updateWidget(index, "width", event.target.value)} style={ui.input}>
                        <option value={1}>1 column</option>
                        <option value={2}>2 columns</option>
                      </select>
                      <select value={widget.height} onChange={(event) => updateWidget(index, "height", event.target.value)} style={ui.input}>
                        <option value={1}>Compact</option>
                        <option value={2}>Tall</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeWidget(index)} style={{ ...ui.secondaryButton, justifyContent: "center" }} className="ui-btn-polish ui-focus-ring">Remove widget</button>
                  </article>
                );
              })}
            </div>
          </WorkspacePanel>
        </>
      ) : null}
    </form>
  );
}
