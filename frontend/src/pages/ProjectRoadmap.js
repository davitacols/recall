import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function ProjectRoadmap() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/`);
      setProject(response.data);
    } catch (error) {
      console.error("Failed to fetch project:", error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center" }}>
        <div style={spinner} />
      </div>
    );
  }

  if (!project) {
    return <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center", color: palette.muted }}>Project not found</div>;
  }

  const sprints = project.sprints || [];

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate(-1)} style={backButton}><ArrowLeftIcon style={icon14} /> Back</button>

        <section style={{ ...hero, background: palette.card, border: `1px solid ${palette.border}` }}>
          <p style={{ ...eyebrow, color: palette.muted }}>ROADMAP</p>
          <h1 style={{ ...title, color: palette.text }}>{project.name}</h1>
          <p style={{ ...subtitle, color: palette.muted }}>Sprint timeline and delivery progression</p>
        </section>

        {sprints.length === 0 ? (
          <div style={empty}>No sprints planned yet.</div>
        ) : (
          <section style={timeline}>
            {sprints.map((sprint) => (
              <article key={sprint.id} style={{ ...timelineCard, background: palette.card, border: `1px solid ${palette.border}` }}>
                <div style={head}>
                  <h2 style={{ margin: 0, color: palette.text, fontSize: 18 }}>{sprint.name}</h2>
                  <span style={pill}>{sprint.status}</span>
                </div>
                <p style={meta}>{sprint.start_date} - {sprint.end_date}</p>
                {sprint.goal && <p style={goal}>{sprint.goal}</p>}
                <div style={stats}>
                  <span>{sprint.issue_count || 0} issues</span>
                  <span>{sprint.completed_count || 0} completed</span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

const spinner = { width: 30, height: 30, border: "2px solid rgba(120,120,120,0.35)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "#7d6d5a", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const hero = { borderRadius: 16, padding: 16, marginBottom: 10 };
const eyebrow = { margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 };
const title = { margin: "8px 0 5px", fontSize: "clamp(1.5rem,3vw,2.2rem)", letterSpacing: "-0.02em" };
const subtitle = { margin: 0, fontSize: 13 };
const timeline = { display: "grid", gap: 8 };
const timelineCard = { borderRadius: 12, padding: 12 };
const head = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const pill = { borderRadius: 999, border: "1px solid rgba(120,120,120,0.4)", padding: "3px 8px", fontSize: 10, color: "#baa892", textTransform: "capitalize", fontWeight: 700 };
const meta = { margin: "6px 0 0", fontSize: 12, color: "#9e8d7b" };
const goal = { margin: "6px 0 0", fontSize: 13, color: "#f4ece0" };
const stats = { marginTop: 8, display: "flex", gap: 12, fontSize: 12, color: "#baa892" };
const empty = { borderRadius: 10, border: "1px dashed rgba(120,120,120,0.35)", padding: "14px 10px", fontSize: 12, color: "#9e8d7b", textAlign: "center", background: "#171215" };
const icon14 = { width: 14, height: 14 };

export default ProjectRoadmap;

