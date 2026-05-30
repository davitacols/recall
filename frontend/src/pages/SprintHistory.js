import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./SprintHistory.css";

export default function SprintHistory() {
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, sprintsRes] = await Promise.all([
        api.get("/api/agile/projects/"),
        api.get("/api/agile/sprint-history/"),
      ]);
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.results || []);
      setSprints(sprintsRes.data?.results || sprintsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = selectedProject
    ? sprints.filter((s) => String(s.project_id) === String(selectedProject))
    : sprints;
  const totalCompleted = sprints.reduce((sum, s) => sum + (s.completed || 0), 0);
  const totalBlocked = sprints.reduce((sum, s) => sum + (s.blocked || 0), 0);

  return (
    <div className="sh">
      <div className="sh-head">
        <div>
          <h1>Sprint history</h1>
          <p>Review what completed, what blocked, and how delivery patterns should shape the next cycle.</p>
        </div>
        <div className="sh-head-actions">
          {projects.length > 0 ? (
            <select
              className="atlas-input sh-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : null}
          <Link to="/projects" className="sh-view">All projects</Link>
        </div>
      </div>

      <div className="sh-stats">
        <span className="sh-stat"><b>{sprints.length}</b><span>Sprints</span></span>
        <span className="sh-stat"><b>{totalCompleted}</b><span>Completed</span></span>
        <span className="sh-stat"><b>{totalBlocked}</b><span>Blocked</span></span>
      </div>

      {loading ? (
        <div className="sh-skel">{[0, 1, 2, 3].map((i) => <div key={i} className="sh-skel-card" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="sh-empty">No completed sprints yet. History fills in as cycles wrap.</div>
      ) : (
        <div className="sh-grid">
          {filtered.map((sprint) => {
            const completed = sprint.completed || 0;
            const blocked = sprint.blocked || 0;
            const total = completed + blocked;
            const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <article key={sprint.id} className="sh-card">
                <div className="sh-card-top">
                  <div style={{ minWidth: 0 }}>
                    <div className="sh-card-name">{sprint.name}</div>
                    <div className="sh-card-meta">
                      {sprint.project_name}{sprint.start_date ? ` · ${sprint.start_date} – ${sprint.end_date}` : ""}
                    </div>
                  </div>
                  <Link to={`/sprints/${sprint.id}`} className="sh-view">View</Link>
                </div>

                <p className="sh-goal">{sprint.goal || "No sprint goal recorded for this cycle."}</p>

                <div className="sh-metrics">
                  <div className="sh-metric done"><b>{completed}</b><span>Completed</span></div>
                  <div className="sh-metric blocked"><b>{blocked}</b><span>Blocked</span></div>
                  <div className="sh-metric decisions"><b>{sprint.decisions || 0}</b><span>Decisions</span></div>
                </div>

                <div>
                  <div className="sh-prog-row"><span>Completion</span><b>{completion}%</b></div>
                  <div className="sh-prog"><div className="sh-prog-fill" style={{ width: `${completion}%` }} /></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
