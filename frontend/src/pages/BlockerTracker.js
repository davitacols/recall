import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  PlusIcon,
  RectangleStackIcon,
  RocketLaunchIcon,
  QueueListIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";
import { WorkspaceHero, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { createPlainTextPreview } from "../utils/textPreview";

const TYPE_OPTIONS = ["all", "technical", "dependency", "decision", "resource", "external"];

function Blockers() {
  const location = useLocation();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [blockers, setBlockers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedSprint, setSelectedSprint] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [isNarrow, setIsNarrow] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "technical",
    sprint_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [blockersRes, sprintsRes] = await Promise.all([
        api.get("/api/agile/blockers/"),
        api.get("/api/agile/sprint-history/"),
      ]);
      setBlockers(Array.isArray(blockersRes.data) ? blockersRes.data : []);
      setSprints(Array.isArray(sprintsRes.data) ? sprintsRes.data : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setErrorMsg(error?.response?.data?.error || "Failed to load blockers.");
      setBlockers([]);
      setSprints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlocker = async (event) => {
    event.preventDefault();
    if (!formData.sprint_id) {
      setErrorMsg("Please select a sprint before reporting a blocker.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await api.post("/api/agile/blockers/", {
        ...formData,
        sprint_id: Number(formData.sprint_id),
      });
      setShowCreateModal(false);
      setFormData({ title: "", description: "", type: "technical", sprint_id: "" });
      await fetchData();
    } catch (error) {
      console.error("Failed to create blocker:", error);
      setErrorMsg(error?.response?.data?.error || "Failed to create blocker.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveBlocker = async (blockerId) => {
    setResolvingId(blockerId);
    setErrorMsg("");
    try {
      await api.post(`/api/agile/blockers/${blockerId}/resolve/`);
      await fetchData();
    } catch (error) {
      console.error("Failed to resolve blocker:", error);
      setErrorMsg(error?.response?.data?.error || "Failed to resolve blocker.");
    } finally {
      setResolvingId(null);
    }
  };

  const filteredBlockers = useMemo(() => {
    return blockers.filter((b) => {
      const sprintMatch = !selectedSprint || String(b.sprint_id) === String(selectedSprint);
      const typeMatch = selectedType === "all" || b.type === selectedType;
      return sprintMatch && typeMatch;
    });
  }, [blockers, selectedSprint, selectedType]);

  const stats = useMemo(() => {
    const total = blockers.length;
    const critical = blockers.filter((b) => Number(b.days_open || 0) >= 7).length;
    const technical = blockers.filter((b) => b.type === "technical").length;
    const avgDays = total === 0 ? 0 : (blockers.reduce((acc, b) => acc + Number(b.days_open || 0), 0) / total).toFixed(1);
    return { total, critical, technical, avgDays };
  }, [blockers]);

  const typeColors = useMemo(
    () => ({
      technical: { bg: "rgba(248,113,113,0.12)", text: palette.danger, border: "rgba(248,113,113,0.35)" },
      dependency: { bg: "rgba(214,170,87,0.16)", text: palette.warn, border: "rgba(214,170,87,0.35)" },
      decision: { bg: palette.accentSoft, text: palette.info, border: "rgba(90,174,231,0.35)" },
      resource: { bg: "rgba(73,191,143,0.14)", text: palette.success, border: "rgba(73,191,143,0.35)" },
      external: { bg: "rgba(115,153,199,0.14)", text: palette.link, border: "rgba(115,153,199,0.35)" },
      default: { bg: "rgba(120,120,120,0.12)", text: palette.muted, border: palette.border },
    }),
    [palette]
  );

  const projectNavItems = [
    { label: "Projects", href: "/projects", icon: RectangleStackIcon },
    { label: "Current Sprint", href: "/sprint", icon: RocketLaunchIcon },
    { label: "Sprint History", href: "/sprint-history", icon: ClockIcon },
    { label: "Sprint Management", href: "/sprint-management", icon: QueueListIcon },
    { label: "Blockers", href: "/blockers", icon: ExclamationTriangleIcon },
    { label: "Retrospectives", href: "/retrospectives", icon: ArrowPathIcon },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 120, borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, opacity: 0.75 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const blockerPulse =
    stats.total === 0
      ? "The blocker lane is clear right now."
      : stats.critical > 0
        ? `${stats.critical} blocker${stats.critical === 1 ? "" : "s"} have been open for 7 or more days and likely need escalation.`
        : `${stats.total} active blocker${stats.total === 1 ? "" : "s"} are being tracked across current sprint work.`;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Risk Board"
          title="Blocker Tracker"
          description="Track active delivery risks, keep blocker ownership visible, and clear issues before they stall the sprint."
          stats={[
            { label: "Active blockers", value: stats.total, helper: "Open blockers currently tracked." },
            { label: "Open 7+ days", value: stats.critical, helper: "Long-running blockers that may need escalation." },
            { label: "Technical", value: stats.technical, helper: "Technical blockers inside the current risk mix." },
            { label: "Avg days open", value: stats.avgDays, helper: "Average blocker age across the tracker." },
          ]}
          aside={
            <div
              style={{
                ...spotlightCard,
                border: `1px solid ${palette.border}`,
                background: darkMode
                  ? "linear-gradient(145deg, rgba(29,24,20,0.96), rgba(20,17,14,0.88))"
                  : "linear-gradient(145deg, rgba(255,252,248,0.98), rgba(245,239,229,0.9))",
              }}
            >
              <p style={{ ...spotlightEyebrow, color: palette.muted }}>Risk pulse</p>
              <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.05, color: palette.text }}>
                {stats.total === 0 ? "Clear lane" : `${stats.total} risks open`}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>{blockerPulse}</p>
            </div>
          }
          actions={
            <button onClick={() => setShowCreateModal(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
              <PlusIcon style={{ width: 15, height: 15 }} />
              Report Blocker
            </button>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={toolbarLayout}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Operations guide</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Keep blockers visible, filter by sprint, and resolve risk before it turns into delivery drift</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                This board works best as the shared escalation lane for sprint work. Use filters to narrow the view, then resolve or report blockers without leaving the execution layer.
              </p>
            </div>
            <div style={toolbarChipRail}>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {selectedSprint ? "Sprint filtered" : "All sprints"}
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Type: {selectedType === "all" ? "all" : selectedType}
              </span>
              <span style={{ ...toolbarChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {filteredBlockers.length} visible
              </span>
            </div>
          </div>
        </WorkspaceToolbar>

        {errorMsg && (
          <div style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${palette.danger}`, background: palette.accentSoft, color: palette.danger, padding: "8px 10px", fontSize: 12 }}>
            {errorMsg}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(250px,320px) minmax(0,1fr)",
            gap: 10,
            alignItems: "start",
          }}
        >
          <aside style={{ position: isNarrow ? "static" : "sticky", top: 78, display: "grid", gap: 10 }}>
            <section
              className="ui-enter"
              style={{
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                background: palette.card,
                padding: 10,
                display: "grid",
                gap: 6,
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>PROJECT NAVIGATION</p>
              {projectNavItems.map((item) => {
                const active =
                  location.pathname === item.href ||
                  (item.href !== "/" && location.pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 10,
                      border: `1px solid ${active ? palette.border : "transparent"}`,
                      background: active ? palette.cardAlt : "transparent",
                      color: active ? palette.text : palette.muted,
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: active ? 700 : 600,
                      padding: "8px 9px",
                    }}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {item.label}
                  </Link>
                );
              })}
            </section>

            <section
              className="ui-enter"
              style={{
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                background: palette.card,
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>OVERVIEW</p>
              <MetricCard label="Active Blockers" value={stats.total} palette={palette} compact />
              <MetricCard label="Open 7+ Days" value={stats.critical} palette={palette} compact />
              <MetricCard label="Technical" value={stats.technical} palette={palette} compact />
              <MetricCard label="Avg Days Open" value={stats.avgDays} palette={palette} compact />
            </section>

            <section
              className="ui-enter"
              style={{
                borderRadius: 14,
                border: `1px solid ${palette.border}`,
                background: palette.card,
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FunnelIcon style={{ width: 14, height: 14, color: palette.muted }} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>FILTERS</p>
              </div>

              <select value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)} style={ui.input}>
                <option value="">All Sprints</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {(sprint.name || sprint.sprint_name || `Sprint ${sprint.id}`) + (sprint.project_name ? ` (${sprint.project_name})` : "")}
                  </option>
                ))}
              </select>

              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={ui.input}>
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Types" : type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              <button onClick={() => setShowCreateModal(true)} className="ui-btn-polish" style={{ ...ui.primaryButton, justifyContent: "center" }}>
                <PlusIcon style={{ width: 14, height: 14 }} />
                New Blocker
              </button>
            </section>
          </aside>

          <main>
            {filteredBlockers.length === 0 ? (
              <section style={{ borderRadius: 14, border: `1px dashed ${palette.border}`, background: palette.card, padding: "28px 14px", textAlign: "center" }}>
                <ExclamationTriangleIcon style={{ width: 38, height: 38, color: palette.muted, margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: palette.text }}>No Active Blockers</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>Everything looks clear for current filters.</p>
              </section>
            ) : (
              <section style={{ display: "grid", gap: 10 }}>
                {filteredBlockers.map((blocker) => {
                  const tone = typeColors[blocker.type] || typeColors.default;
                  return (
                    <article
                      key={blocker.id}
                      className="ui-card-lift ui-smooth"
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${palette.border}`,
                        borderLeft: `4px solid ${tone.text}`,
                        background: palette.cardAlt,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ borderRadius: 999, border: `1px solid ${tone.border}`, background: tone.bg, color: tone.text, padding: "3px 9px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>
                              {blocker.type || "other"}
                            </span>
                            <span style={{ fontSize: 11, color: palette.muted, fontWeight: 700 }}>
                              {Number(blocker.days_open || 0)} day{Number(blocker.days_open || 0) === 1 ? "" : "s"} open
                            </span>
                          </div>
                          <h3 style={{ margin: 0, fontSize: 16, color: palette.text }}>{blocker.title || "Untitled blocker"}</h3>
                          <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>
                            {createPlainTextPreview(blocker.description || "", "No description provided.", 180)}
                          </p>
                          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: palette.muted }}>
                            <span>Sprint: <strong style={{ color: palette.text }}>{blocker.sprint_name || "Unassigned"}</strong></span>
                            <span>Reported by: <strong style={{ color: palette.text }}>{blocker.blocked_by || "Unknown"}</strong></span>
                            {blocker.assigned_to && <span>Assigned to: <strong style={{ color: palette.text }}>{blocker.assigned_to}</strong></span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleResolveBlocker(blocker.id)}
                          className="ui-btn-polish"
                          style={{
                            ...ui.secondaryButton,
                            borderColor: palette.success,
                            color: palette.success,
                            padding: "8px 10px",
                            opacity: resolvingId === blocker.id ? 0.7 : 1,
                          }}
                          disabled={resolvingId === blocker.id}
                        >
                          <CheckCircleIcon style={{ width: 14, height: 14 }} />
                          {resolvingId === blocker.id ? "Resolving..." : "Resolve"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </main>
        </section>

        {showCreateModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 150, background: darkMode ? "rgba(5,12,20,0.62)" : "rgba(15,32,45,0.36)", display: "grid", placeItems: "center", padding: 14 }} onClick={() => !submitting && setShowCreateModal(false)}>
            <div style={{ width: "min(620px,100%)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Report Blocker</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: palette.muted }}>Capture what is blocked and where escalation is needed.</p>

              <form onSubmit={handleCreateBlocker} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <select
                  value={formData.sprint_id}
                  onChange={(e) => setFormData({ ...formData, sprint_id: e.target.value })}
                  style={ui.input}
                  required
                >
                  <option value="">Select Sprint</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {(sprint.name || sprint.sprint_name || `Sprint ${sprint.id}`) + (sprint.project_name ? ` (${sprint.project_name})` : "")}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What is blocked?"
                  style={ui.input}
                  required
                />

                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={ui.input}
                >
                  <option value="technical">Technical</option>
                  <option value="dependency">Dependency</option>
                  <option value="decision">Decision Needed</option>
                  <option value="resource">Resource</option>
                  <option value="external">External</option>
                </select>

                <textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add context, impact, and next action."
                  style={ui.input}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="ui-btn-polish" style={ui.secondaryButton} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="ui-btn-polish" style={{ ...ui.primaryButton, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                    {submitting ? "Reporting..." : "Report Blocker"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, palette, compact = false }) {
  return (
    <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: compact ? 8 : 10 }}>
      <p style={{ margin: 0, fontSize: 10, color: palette.muted, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: compact ? 20 : 24, color: palette.text, fontWeight: 800 }}>{value}</p>
    </article>
  );
}

const spotlightCard = { minWidth: 240, borderRadius: 24, padding: 16, display: "grid", gap: 10 };
const spotlightEyebrow = { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarLayout = { display: "grid", gap: 14 };
const toolbarIntro = { display: "grid", gap: 4 };
const toolbarEyebrow = { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" };
const toolbarTitle = { margin: 0, fontSize: 24, lineHeight: 1.04 };
const toolbarCopy = { margin: 0, fontSize: 13, lineHeight: 1.65, maxWidth: 760 };
const toolbarChipRail = { display: "flex", gap: 8, flexWrap: "wrap" };
const toolbarChip = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 };

export default Blockers;

