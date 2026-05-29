import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronRightIcon,
  CubeIcon,
  PencilIcon,
  PlusIcon,
  RocketLaunchIcon,
  Squares2X2Icon,
  TrashIcon,
  UsersIcon,
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
import { statusToLozenge } from "../utils/designTokens";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function projectColor(slug) {
  const palette = ["#0052CC", "#00875A", "#5243AA", "#DE350B", "#00A3BF", "#FF8B00", "#172B4D", "#6554C0"];
  let h = 0;
  const s = String(slug || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [team, setTeam] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", lead_id: "" });
  const [issueForm, setIssueForm] = useState({ title: "", description: "", priority: "medium", sprint_id: "", assignee_id: "" });
  const [sprintForm, setSprintForm] = useState({ name: "", start_date: "", end_date: "", goal: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [projRes, sprintsRes, issuesRes, memRes] = await Promise.all([
          api.get(`/api/agile/projects/${projectId}/`),
          api.get(`/api/agile/projects/${projectId}/sprints/`).catch(() => ({ data: [] })),
          api.get(`/api/agile/projects/${projectId}/issues/`).catch(() => ({ data: [] })),
          api.get("/api/organizations/members/").catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setProject(projRes.data);
        setSprints(Array.isArray(sprintsRes.data) ? sprintsRes.data : sprintsRes.data?.results || []);
        setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : issuesRes.data?.results || []);
        setBoards(projRes.data?.boards || []);
        setTeam(projRes.data?.members || projRes.data?.team || []);
        setMembers(Array.isArray(memRes.data) ? memRes.data : memRes.data?.results || []);
      } catch (_) {
        if (mounted) setProject(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [projectId]);

  const reloadProject = async () => {
    try {
      const [projRes, sprintsRes, issuesRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`).catch(() => ({ data: [] })),
        api.get(`/api/agile/projects/${projectId}/issues/`).catch(() => ({ data: [] })),
      ]);
      setProject(projRes.data);
      setSprints(Array.isArray(sprintsRes.data) ? sprintsRes.data : sprintsRes.data?.results || []);
      setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : issuesRes.data?.results || []);
      setBoards(projRes.data?.boards || []);
    } catch (_) {}
  };

  const openEdit = () => {
    setEditForm({
      name: project?.name || "",
      description: project?.description || "",
      lead_id: project?.lead_id ? String(project.lead_id) : "",
    });
    setShowEdit(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description,
        lead_id: editForm.lead_id || null,
      };
      try {
        await api.patch(`/api/agile/projects/${projectId}/`, payload);
      } catch (err) {
        if (err?.response?.status === 405) {
          await api.put(`/api/agile/projects/${projectId}/`, payload);
        } else {
          throw err;
        }
      }
      setShowEdit(false);
      await reloadProject();
      toast.success?.("Project updated");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not update project");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: issueForm.title,
        description: issueForm.description,
        priority: issueForm.priority,
      };
      if (issueForm.sprint_id) payload.sprint_id = parseInt(issueForm.sprint_id, 10);
      if (issueForm.assignee_id) payload.assignee_id = parseInt(issueForm.assignee_id, 10);
      await api.post(`/api/agile/projects/${projectId}/issues/`, payload);
      setShowCreateIssue(false);
      setIssueForm({ title: "", description: "", priority: "medium", sprint_id: "", assignee_id: "" });
      await reloadProject();
      toast.success?.("Issue created");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not create issue");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/sprints/`, sprintForm);
      setShowCreateSprint(false);
      setSprintForm({ name: "", start_date: "", end_date: "", goal: "" });
      await reloadProject();
      toast.success?.("Sprint created");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not create sprint");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/api/agile/projects/${projectId}/delete/`);
      navigate("/projects");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not delete project");
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "issues", label: "Issues", count: issues.length },
    { id: "sprints", label: "Sprints", count: sprints.length },
    { id: "boards", label: "Boards", count: boards.length },
    { id: "team", label: "Team", count: team.length },
  ];

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading project…</div>;
  }
  if (!project) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Project not found">
          We couldn't find that project.
        </SectionMessage>
      </div>
    );
  }

  const initial = (project.name || project.slug || "P").trim().charAt(0).toUpperCase();

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[
          { label: "Projects", to: "/projects" },
          { label: project.name || project.slug || "Project" },
        ]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ ...projectIcon, background: projectColor(project.slug || project.key) }}>{initial}</span>
            {project.name}
            <span style={keyChip}>{project.key || (project.slug || "").toUpperCase()}</span>
          </span>
        }
        subtitle={project.description || ""}
        actions={
          <>
            <Button appearance="subtle" iconBefore={<PencilIcon style={{ width: 14, height: 14 }} />} onClick={openEdit}>
              Edit
            </Button>
            <Button
              appearance="primary"
              iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
              onClick={() => setShowCreateIssue(true)}
            >
              Create issue
            </Button>
          </>
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={{ marginTop: 16 }}>
        {tab === "overview" ? (
          <OverviewTab
            project={project}
            issues={issues}
            sprints={sprints}
            boards={boards}
            team={team}
            onCreateIssue={() => setShowCreateIssue(true)}
            onCreateSprint={() => setShowCreateSprint(true)}
            onDelete={handleDelete}
          />
        ) : null}
        {tab === "issues" ? <IssuesTab issues={issues} /> : null}
        {tab === "sprints" ? (
          <SprintsTab
            sprints={sprints}
            onCreate={() => setShowCreateSprint(true)}
          />
        ) : null}
        {tab === "boards" ? <BoardsTab boards={boards} /> : null}
        {tab === "team" ? <TeamTab team={team} lead={project} /> : null}
      </div>

      {showEdit ? (
        <Modal title="Edit project" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleSaveProject} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name" isRequired>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="atlas-input" required />
            </Field>
            <Field label="Description">
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="atlas-input" rows={4} />
            </Field>
            <Field label="Project lead">
              <select value={editForm.lead_id} onChange={(e) => setEditForm({ ...editForm, lead_id: e.target.value })} className="atlas-input">
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id || m.user_id} value={m.id || m.user_id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Button type="button" appearance="danger" iconBefore={<TrashIcon style={{ width: 14, height: 14 }} />} onClick={handleDelete}>
                Delete project
              </Button>
              <div style={{ display: "flex", gap: 8 }}>
                <Button type="button" appearance="subtle" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" appearance="primary" isDisabled={busy || !editForm.name.trim()}>{busy ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}

      {showCreateIssue ? (
        <Modal title="Create issue" onClose={() => setShowCreateIssue(false)}>
          <form onSubmit={handleCreateIssue} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={issueForm.title} onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} className="atlas-input" rows={5} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Priority">
                <select value={issueForm.priority} onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })} className="atlas-input">
                  {["lowest", "low", "medium", "high", "highest"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Sprint">
                <select value={issueForm.sprint_id} onChange={(e) => setIssueForm({ ...issueForm, sprint_id: e.target.value })} className="atlas-input">
                  <option value="">Backlog</option>
                  {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Assignee">
              <select value={issueForm.assignee_id} onChange={(e) => setIssueForm({ ...issueForm, assignee_id: e.target.value })} className="atlas-input">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id || m.user_id} value={m.id || m.user_id}>{m.full_name || m.email}</option>)}
              </select>
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreateIssue(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={busy || !issueForm.title.trim()}>{busy ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showCreateSprint ? (
        <Modal title="Create sprint" onClose={() => setShowCreateSprint(false)}>
          <form onSubmit={handleCreateSprint} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name" isRequired>
              <input value={sprintForm.name} onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Start date">
                <input type="date" value={sprintForm.start_date} onChange={(e) => setSprintForm({ ...sprintForm, start_date: e.target.value })} className="atlas-input" />
              </Field>
              <Field label="End date">
                <input type="date" value={sprintForm.end_date} onChange={(e) => setSprintForm({ ...sprintForm, end_date: e.target.value })} className="atlas-input" />
              </Field>
            </div>
            <Field label="Goal">
              <textarea value={sprintForm.goal} onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })} className="atlas-input" rows={3} />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreateSprint(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={busy || !sprintForm.name.trim()}>{busy ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function OverviewTab({ project, issues, sprints, boards, team, onCreateIssue, onCreateSprint }) {
  const stats = useMemo(() => {
    const open = issues.filter((i) => !["done", "closed", "resolved"].includes(String(i.status || "").toLowerCase())).length;
    const done = issues.length - open;
    const activeSprint = sprints.find((s) => s.is_active || s.state === "active" || s.status === "active");
    return { open, done, total: issues.length, activeSprint };
  }, [issues, sprints]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24 }}>
      <section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Open issues" value={stats.open} />
          <StatCard label="Done" value={stats.done} />
          <StatCard label="Total" value={stats.total} />
        </div>

        <SectionHeading title="Recent issues" action={<Button appearance="subtle" size="sm" iconAfter={<ArrowRightIcon style={{ width: 12, height: 12 }} />} onClick={onCreateIssue}>Create issue</Button>} />
        <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" }}>
          {issues.slice(0, 6).map((iss) => (
            <Link key={iss.id} to={`/issues/${iss.id}`} style={rowLink}>
              <span style={keyChip}>{iss.key || `#${iss.id}`}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {iss.title || iss.summary || "Untitled"}
              </span>
              <Lozenge status={iss.status} />
              <Avatar size="sm" name={iss.assignee_name || iss.assignee || "Unassigned"} />
            </Link>
          ))}
          {issues.length === 0 ? <div style={{ padding: 16, color: "var(--app-muted)", fontSize: 13 }}>No issues yet.</div> : null}
        </div>
      </section>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SidebarCard title="Active sprint">
          {stats.activeSprint ? (
            <>
              <p style={{ margin: 0, fontWeight: 600 }}>{stats.activeSprint.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--app-muted)" }}>
                {stats.activeSprint.start_date ? `${formatDate(stats.activeSprint.start_date)} – ${formatDate(stats.activeSprint.end_date)}` : "No dates set"}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "var(--app-muted)" }}>
              No active sprint. <button type="button" onClick={onCreateSprint} style={linkBtn}>Create one</button>
            </p>
          )}
        </SidebarCard>

        <SidebarCard title="Lead & team" icon={<UsersIcon style={{ width: 14, height: 14 }} />}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
            <Avatar size="md" name={project.lead_name || "Unassigned"} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{project.lead_name || "No lead"}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)" }}>Project lead</p>
            </div>
          </div>
          {team.slice(0, 5).map((m) => (
            <div key={m.id || m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <Avatar size="sm" name={m.full_name || m.email || ""} />
              <span style={{ fontSize: 13, color: "var(--app-text)" }}>{m.full_name || m.email}</span>
            </div>
          ))}
        </SidebarCard>

        <SidebarCard title="Boards" icon={<Squares2X2Icon style={{ width: 14, height: 14 }} />}>
          {boards.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--app-muted)" }}>No boards yet.</p>
          ) : (
            boards.map((b) => (
              <Link key={b.id} to={`/boards/${b.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", color: "var(--app-text)", textDecoration: "none", fontSize: 13, borderBottom: "1px solid var(--app-border-subtle)" }}>
                <span>{b.name}</span>
                <ChevronRightIcon style={{ width: 12, height: 12, color: "var(--app-muted)" }} />
              </Link>
            ))
          )}
        </SidebarCard>
      </aside>
    </div>
  );
}

function IssuesTab({ issues }) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={<CubeIcon style={{ width: "100%", height: "100%" }} />}
        title="No issues yet"
        description="Track work in this project by creating an issue."
      />
    );
  }
  return (
    <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--app-surface-alt)" }}>
            <th style={th}>Key</th>
            <th style={{ ...th, width: "50%" }}>Summary</th>
            <th style={th}>Status</th>
            <th style={th}>Priority</th>
            <th style={th}>Assignee</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((iss) => (
            <tr key={iss.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
              <td style={td}><span style={keyChip}>{iss.key || `#${iss.id}`}</span></td>
              <td style={td}>
                <Link to={`/issues/${iss.id}`} style={{ color: "var(--app-link)", textDecoration: "none", fontWeight: 500 }}>
                  {iss.title || iss.summary || "Untitled"}
                </Link>
              </td>
              <td style={td}><Lozenge status={iss.status} /></td>
              <td style={td}>{iss.priority || "—"}</td>
              <td style={td}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Avatar size="sm" name={iss.assignee_name || iss.assignee || "Unassigned"} />
                  <span style={{ fontSize: 13 }}>{iss.assignee_name || iss.assignee || "—"}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SprintsTab({ sprints, onCreate }) {
  if (sprints.length === 0) {
    return (
      <EmptyState
        icon={<RocketLaunchIcon style={{ width: "100%", height: "100%" }} />}
        title="No sprints yet"
        description="Plan a sprint to start tracking delivery rhythm."
        primaryAction={<Button appearance="primary" onClick={onCreate}>Create sprint</Button>}
      />
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button appearance="primary" size="sm" iconBefore={<PlusIcon style={{ width: 12, height: 12 }} />} onClick={onCreate}>
          Create sprint
        </Button>
      </div>
      {sprints.map((s) => (
        <div key={s.id} style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{s.name}</p>
              <Lozenge status={s.is_active ? "in_progress" : s.is_completed ? "done" : "todo"}>
                {s.is_active ? "Active" : s.is_completed ? "Completed" : "Upcoming"}
              </Lozenge>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--app-muted)" }}>
              {s.start_date ? formatDate(s.start_date) : "—"} – {s.end_date ? formatDate(s.end_date) : "—"}
            </p>
            {s.goal ? <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--app-text)" }}>{s.goal}</p> : null}
          </div>
          <Link to={`/sprint/${s.id}`} style={{ color: "var(--app-link)", textDecoration: "none", fontSize: 13 }}>Open →</Link>
        </div>
      ))}
    </div>
  );
}

function BoardsTab({ boards }) {
  if (boards.length === 0) {
    return (
      <EmptyState
        icon={<Squares2X2Icon style={{ width: "100%", height: "100%" }} />}
        title="No boards"
        description="Create a kanban or scrum board to visualize work."
      />
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {boards.map((b) => (
        <Link key={b.id} to={`/boards/${b.id}`} style={{ display: "block", background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 16, textDecoration: "none", color: "var(--app-text)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Squares2X2Icon style={{ width: 16, height: 16, color: "var(--b400)" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>{b.name}</p>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)" }}>{b.type || "Kanban"}</p>
        </Link>
      ))}
    </div>
  );
}

function TeamTab({ team, lead }) {
  if (team.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon style={{ width: "100%", height: "100%" }} />}
        title="No team members yet"
        description="Invite members from the Team Management page."
      />
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
      {team.map((m) => (
        <div key={m.id || m.user_id} style={{ display: "flex", gap: 12, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 16 }}>
          <Avatar size="lg" name={m.full_name || m.email || ""} />
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{m.full_name || m.email}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--app-muted)" }}>{m.role || (lead?.lead_id === m.id ? "Lead" : "Member")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 500, color: "var(--app-text)" }}>{value}</p>
    </div>
  );
}

function SectionHeading({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 8px" }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>{title}</h2>
      {action}
    </div>
  );
}

function SidebarCard({ title, icon, children }) {
  return (
    <div style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4 }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--app-border-subtle)", display: "flex", alignItems: "center", gap: 6 }}>
        {icon ? <span style={{ color: "var(--app-muted)" }}>{icon}</span> : null}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--app-muted)" }}>{title}</span>
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function Modal({ children, onClose, title, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={modalBackdrop} />
      <div role="dialog" aria-modal="true" style={{ ...modalShell, width }}>
        <div style={modalHeader}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--app-text)" }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>
      </div>
    </>
  );
}

const projectIcon = { width: 32, height: 32, borderRadius: 4, color: "#FFFFFF", fontWeight: 700, fontSize: 14, display: "inline-grid", placeItems: "center", flexShrink: 0 };
const keyChip = { display: "inline-flex", alignItems: "center", height: 20, padding: "0 6px", background: "var(--n20)", border: "1px solid var(--app-border-subtle)", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--app-muted)", fontWeight: 600 };
const linkBtn = { background: "transparent", border: "none", color: "var(--app-link)", padding: 0, cursor: "pointer", fontSize: "inherit" };
const rowLink = { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--app-border-subtle)", color: "inherit", textDecoration: "none" };
const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
const modalBackdrop = { position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 };
const modalShell = { position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" };
const modalHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" };
