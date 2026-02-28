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
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const TYPE_OPTIONS = ["all", "technical", "dependency", "decision", "resource", "external"];

const TYPE_COLORS = {
  technical: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.35)" },
  dependency: { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "rgba(249,115,22,0.35)" },
  decision: { bg: "rgba(37,99,235,0.12)", text: "#2563eb", border: "rgba(37,99,235,0.35)" },
  resource: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.35)" },
  external: { bg: "rgba(168,85,247,0.12)", text: "#a855f7", border: "rgba(168,85,247,0.35)" },
  default: { bg: "rgba(120,120,120,0.12)", text: "#8b8b8b", border: "rgba(120,120,120,0.35)" },
};

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
      <div style={{ minHeight: "100vh", background: palette.bg }}>
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

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section
          className="ui-enter"
          style={{
            borderRadius: 18,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "radial-gradient(circle at 8% 15%, rgba(239,68,68,0.24), rgba(18,18,18,0.25) 52%), linear-gradient(140deg, rgba(255,167,97,0.16), rgba(87,205,184,0.14))"
              : "radial-gradient(circle at 8% 15%, rgba(239,68,68,0.18), rgba(255,255,255,0.2) 54%), linear-gradient(140deg, rgba(255,196,146,0.52), rgba(152,243,223,0.42))",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>RISK BOARD</p>
              <h1 style={{ margin: "8px 0 5px", fontSize: "clamp(1.6rem,3vw,2.35rem)", color: palette.text }}>Blocker Tracker</h1>
              <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Track active delivery risks and clear blockers before they stall the sprint.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="ui-btn-polish" style={ui.primaryButton}>
              <PlusIcon style={{ width: 15, height: 15 }} />
              Report Blocker
            </button>
          </div>
        </section>

        {errorMsg && (
          <div style={{ marginBottom: 10, borderRadius: 10, border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)", color: "#ef4444", padding: "8px 10px", fontSize: 12 }}>
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
                  const tone = TYPE_COLORS[blocker.type] || TYPE_COLORS.default;
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
                            {blocker.description || "No description provided."}
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
                            borderColor: "rgba(16,185,129,0.45)",
                            color: "#10b981",
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
          <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.66)", display: "grid", placeItems: "center", padding: 14 }} onClick={() => !submitting && setShowCreateModal(false)}>
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

export default Blockers;
