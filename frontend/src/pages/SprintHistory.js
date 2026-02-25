import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function SprintHistory() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, sprintsRes] = await Promise.all([
        api.get("/api/agile/projects/"),
        api.get("/api/agile/sprint-history/"),
      ]);
      setProjects(projectsRes.data || []);
      setSprints(sprintsRes.data.results || sprintsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSprints = selectedProject ? sprints.filter((sprint) => sprint.project_id === selectedProject) : sprints;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 200, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>SPRINT HISTORY</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Sprint History</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Institutional memory of outcomes, blockers, and delivery trend.</p>
        </section>

        {projects.length > 0 && (
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted, marginBottom: 6 }}>
              Filter by project
            </label>
            <select
              value={selectedProject || ""}
              onChange={(event) => setSelectedProject(event.target.value ? parseInt(event.target.value, 10) : null)}
              style={{ ...ui.input, maxWidth: 300 }}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </section>
        )}

        {filteredSprints.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No completed sprints yet.
          </div>
        ) : (
          <section style={{ display: "grid", gap: 10 }}>
            {filteredSprints.map((sprint) => {
              const total = (sprint.completed || 0) + (sprint.blocked || 0);
              const completion = total > 0 ? Math.round(((sprint.completed || 0) / total) * 100) : 0;

              return (
                <article key={sprint.id} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: palette.text }}>{sprint.name}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>
                        {sprint.project_name} | {sprint.start_date} - {sprint.end_date}
                      </p>
                    </div>
                    <Link to={`/sprints/${sprint.id}`} style={{ ...ui.secondaryButton, textDecoration: "none" }}>View Details</Link>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                    <Metric label="Completed" value={sprint.completed || 0} color="#10b981" />
                    <Metric label="Blocked" value={sprint.blocked || 0} color="#ef4444" />
                    <Metric label="Decisions" value={sprint.decisions || 0} color="#60a5fa" />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: palette.muted }}>Completion</span>
                      <span style={{ fontSize: 11, color: palette.text, fontWeight: 700 }}>{completion}%</span>
                    </div>
                    <div style={{ width: "100%", height: 8, borderRadius: 999, background: "rgba(120,120,120,0.25)", overflow: "hidden" }}>
                      <div style={{ width: `${completion}%`, height: "100%", background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <div style={{ marginTop: 12 }}>
          <a href="/projects" style={{ ...ui.primaryButton, textDecoration: "none" }}>View All Projects</a>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <article style={{ borderRadius: 10, border: "1px solid rgba(120,120,120,0.3)", background: "#1f181c", padding: 10 }}>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#baa892" }}>{label}</p>
    </article>
  );
}

export default SprintHistory;
