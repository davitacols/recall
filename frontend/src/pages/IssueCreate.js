import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function IssueCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get("boardId");
  const { darkMode } = useTheme();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignee_id: "",
    sprint_id: "",
    story_points: "",
    due_date: "",
  });

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [sprints, setSprints] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSprints(selectedProject);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get("/api/agile/projects/");
      const projectList = response.data || [];
      setProjects(projectList);
      if (projectList.length > 0) {
        setSelectedProject(String(projectList[0].id));
      } else {
        setError("No projects available. Please create a project first.");
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  const fetchSprints = async (projectId) => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/sprints/`);
      setSprints(response.data || []);
    } catch (error) {
      console.error("Failed to fetch sprints:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await api.get("/api/organizations/members/");
      setTeamMembers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      setTeamMembers([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!selectedProject) {
      setError("Project is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description,
        priority: formData.priority,
        project_id: parseInt(selectedProject, 10),
        status: "todo",
      };

      if (formData.assignee_id) payload.assignee_id = parseInt(formData.assignee_id, 10);
      if (formData.sprint_id) payload.sprint_id = parseInt(formData.sprint_id, 10);
      if (formData.story_points) payload.story_points = parseInt(formData.story_points, 10);
      if (formData.due_date) payload.due_date = formData.due_date;

      await api.post(`/api/agile/projects/${selectedProject}/issues/`, payload);
      navigate(`/boards/${boardId || 1}`);
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to create issue"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate(-1)} style={{ ...backButton, color: palette.muted }}>
          <ArrowLeftIcon style={icon14} /> Back
        </button>

        <section style={{ ...card, background: palette.card, border: `1px solid ${palette.border}` }}>
          <h1 style={{ ...title, color: palette.text }}>Create New Issue</h1>

          {error && <div style={errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={formStack}>
            <Field label="Project">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={ui.input}>
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <input name="title" value={formData.title} onChange={handleChange} placeholder="Issue title" style={ui.input} />
            </Field>

            <Field label="Description">
              <textarea name="description" value={formData.description} onChange={handleChange} rows={5} placeholder="Issue description" style={{ ...ui.input, resize: "vertical" }} />
            </Field>

            <div style={ui.twoCol}>
              <Field label="Priority">
                <select name="priority" value={formData.priority} onChange={handleChange} style={ui.input}>
                  <option value="lowest">Lowest</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="highest">Highest</option>
                </select>
              </Field>
              <Field label="Story Points">
                <input type="number" name="story_points" value={formData.story_points} onChange={handleChange} placeholder="0" style={ui.input} />
              </Field>
            </div>

            <div style={ui.twoCol}>
              <Field label="Sprint">
                <select name="sprint_id" value={formData.sprint_id} onChange={handleChange} style={ui.input}>
                  <option value="">No Sprint</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>{sprint.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assignee">
                <select name="assignee_id" value={formData.assignee_id} onChange={handleChange} style={ui.input}>
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.full_name || member.username}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Due Date">
              <input type="date" name="due_date" value={formData.due_date} onChange={handleChange} style={ui.input} />
            </Field>

            <div style={buttonRow}>
              <button type="button" onClick={() => navigate(-1)} style={ui.secondaryButton}>Cancel</button>
              <button type="submit" disabled={loading} style={ui.primaryButton}>{loading ? "Creating..." : "Create Issue"}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={field}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const backButton = { display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 };
const card = { borderRadius: 16, padding: 16 };
const title = { margin: 0, fontSize: "clamp(1.5rem,3vw,2rem)", letterSpacing: "-0.02em" };
const errorBox = { marginTop: 10, border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 10, padding: "10px 12px", fontSize: 13 };
const formStack = { marginTop: 14, display: "grid", gap: 10 };
const field = { display: "grid", gap: 6 };
const fieldLabel = { fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, color: "#9e8d7b" };
const buttonRow = { marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 8 };
const icon14 = { width: 14, height: 14 };

export default IssueCreate;

