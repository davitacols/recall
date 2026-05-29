import React, { useEffect, useMemo, useState } from "react";
import { ChartBarIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

function normalizeItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function safeCompletionRate(velocity) {
  if (!velocity) return 0;
  const completed = velocity.completed_story_points ?? velocity.completed ?? 0;
  const committed = velocity.committed_story_points ?? velocity.committed ?? 0;
  if (!committed) return 0;
  return Math.round((completed / committed) * 100);
}

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("");
  const [velocity, setVelocity] = useState(null);
  const [burndown, setBurndown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api.get("/api/agile/projects/")
      .then((res) => {
        if (!mounted) return;
        const list = normalizeItems(res?.data);
        setProjects(list);
        setSelectedProject((current) => current || String(list[0]?.id || ""));
      })
      .catch(() => mounted && setError("We could not load agile projects for reporting."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setSprints([]);
      setSelectedSprint("");
      setVelocity(null);
      setBurndown(null);
      return;
    }
    let mounted = true;
    setReportLoading(true);
    Promise.allSettled([
      api.get(`/api/agile/projects/${selectedProject}/sprints/`),
      api.get(`/api/agile/projects/${selectedProject}/velocity/`),
    ]).then(([sprintRes, velRes]) => {
      if (!mounted) return;
      const list = sprintRes.status === "fulfilled" ? normalizeItems(sprintRes.value.data) : [];
      setSprints(list);
      setSelectedSprint((cur) => (list.some((s) => String(s.id) === String(cur)) ? cur : String(list[0]?.id || "")));
      setVelocity(velRes.status === "fulfilled" ? velRes.value.data : null);
    }).finally(() => mounted && setReportLoading(false));
    return () => { mounted = false; };
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedSprint) {
      setBurndown(null);
      return;
    }
    let mounted = true;
    api.get(`/api/agile/sprints/${selectedSprint}/burndown/`)
      .then((res) => mounted && setBurndown(res.data))
      .catch(() => mounted && setBurndown(null));
    return () => { mounted = false; };
  }, [selectedSprint]);

  const completionRate = safeCompletionRate(velocity);
  const burndownPoints = burndown?.data || [];
  const remaining = burndownPoints[burndownPoints.length - 1]?.actual ?? 0;

  const stats = useMemo(() => ([
    { label: "Completion rate", value: `${completionRate}%`, tone: completionRate >= 80 ? "g" : completionRate >= 50 ? "b" : "y" },
    { label: "Committed", value: velocity?.committed_story_points ?? velocity?.committed ?? "—" },
    { label: "Completed", value: velocity?.completed_story_points ?? velocity?.completed ?? "—" },
    { label: "Remaining", value: remaining },
  ]), [completionRate, velocity, remaining]);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Reports" }]}
        title="Reports"
        subtitle="Velocity, burndown, and sprint outcomes across the workspace."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={toolbar}>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="atlas-input"
          style={{ width: 240 }}
          disabled={loading}
        >
          {projects.length === 0 ? <option value="">No projects</option> : null}
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name || p.slug || `Project ${p.id}`}</option>)}
        </select>
        <select
          value={selectedSprint}
          onChange={(e) => setSelectedSprint(e.target.value)}
          className="atlas-input"
          style={{ width: 240 }}
          disabled={reportLoading || sprints.length === 0}
        >
          {sprints.length === 0 ? <option value="">No sprints</option> : null}
          {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {reportLoading ? <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Loading…</span> : null}
      </div>

      {loading || !projects.length ? (
        <EmptyState
          icon={<ChartBarIcon style={{ width: "100%", height: "100%" }} />}
          title="No data to report"
          description="Create a project and run a sprint to start seeing velocity and burndown."
        />
      ) : (
        <>
          <section style={statsRow}>
            {stats.map((s) => (
              <div key={s.label} style={statCard}>
                <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{s.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 500, color: s.tone === "g" ? "var(--g400)" : s.tone === "b" ? "var(--b400)" : s.tone === "y" ? "var(--y400)" : "var(--app-text)" }}>{s.value}</p>
              </div>
            ))}
          </section>

          <section style={panel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Burndown</h2>
              {burndown?.sprint_name ? <Lozenge>{burndown.sprint_name}</Lozenge> : null}
            </div>
            {burndownPoints.length === 0 ? (
              <p style={{ color: "var(--app-muted)", fontSize: 13, margin: 0 }}>No burndown data for this sprint.</p>
            ) : (
              <BurndownChart points={burndownPoints} />
            )}
          </section>

          <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Velocity (last sprints)</h2>
            {(velocity?.history || []).length === 0 ? (
              <p style={{ color: "var(--app-muted)", fontSize: 13, margin: 0 }}>No velocity history yet.</p>
            ) : (
              <VelocityBars history={velocity.history} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function BurndownChart({ points }) {
  const max = Math.max(...points.map((p) => Math.max(p.actual || 0, p.ideal || 0)), 1);
  const w = 720;
  const h = 200;
  const pad = 24;
  const stepX = (w - pad * 2) / Math.max(points.length - 1, 1);
  const y = (v) => h - pad - ((v / max) * (h - pad * 2));
  const idealPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${y(p.ideal || 0)}`).join(" ");
  const actualPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${y(p.actual || 0)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ background: "var(--app-surface-alt)", borderRadius: 4 }}>
      <path d={idealPath} stroke="var(--n50)" strokeDasharray="4 4" strokeWidth="2" fill="none" />
      <path d={actualPath} stroke="var(--b400)" strokeWidth="2.5" fill="none" />
      {points.map((p, i) => (
        <circle key={i} cx={pad + i * stepX} cy={y(p.actual || 0)} r="3" fill="var(--b400)" />
      ))}
    </svg>
  );
}

function VelocityBars({ history }) {
  const max = Math.max(...history.map((h) => Math.max(h.committed || 0, h.completed || 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 200, padding: "0 8px" }}>
      {history.map((s, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160 }}>
            <div title={`Committed: ${s.committed || 0}`} style={{ width: 16, height: `${((s.committed || 0) / max) * 100}%`, background: "var(--n50)", borderRadius: 2 }} />
            <div title={`Completed: ${s.completed || 0}`} style={{ width: 16, height: `${((s.completed || 0) / max) * 100}%`, background: "var(--b400)", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--app-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{s.name || `S${i + 1}`}</span>
        </div>
      ))}
    </div>
  );
}

const toolbar = {
  marginTop: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingBottom: 16,
};

const statsRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
};

const statCard = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const panel = {
  marginTop: 16,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 20,
};
