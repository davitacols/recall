import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
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
} from "../components/atlas";

const PRIORITY_COLORS = {
  highest: "var(--r500)",
  high: "var(--r400)",
  medium: "var(--y400)",
  low: "var(--g400)",
  lowest: "var(--g500)",
};

function priorityIcon(p) {
  const key = String(p || "").toLowerCase();
  if (["highest", "high"].includes(key)) return <ArrowUpIcon style={{ width: 12, height: 12, color: PRIORITY_COLORS[key] || "var(--r400)" }} />;
  if (["low", "lowest"].includes(key)) return <ArrowDownIcon style={{ width: 12, height: 12, color: PRIORITY_COLORS[key] || "var(--g400)" }} />;
  return <Bars3Icon style={{ width: 12, height: 12, color: PRIORITY_COLORS.medium }} />;
}

function typeBadge(type) {
  const t = String(type || "task").toLowerCase();
  const map = {
    bug:   { bg: "var(--r400)", icon: <ExclamationTriangleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    story: { bg: "var(--g400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    task:  { bg: "var(--b400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
    epic:  { bg: "var(--p400)", icon: <CheckCircleIcon style={{ width: 10, height: 10, color: "#FFFFFF" }} /> },
  };
  const e = map[t] || map.task;
  return (
    <span title={t} style={{ width: 16, height: 16, borderRadius: 3, background: e.bg, display: "inline-grid", placeItems: "center", flexShrink: 0 }}>
      {e.icon}
    </span>
  );
}

export default function Backlog() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [backlogIssues, setBacklogIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", issue_type: "story", priority: "medium" });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [backlogRes, sprintsRes] = await Promise.all([
        api.get(`/api/agile/projects/${projectId}/backlog/`),
        api.get(`/api/agile/projects/${projectId}/sprints/`),
      ]);
      const issues = (backlogRes.data?.issues || backlogRes.data || []).filter((issue) => !issue.sprint_id);
      setBacklogIssues(issues);
      const sprintList = Array.isArray(sprintsRes.data) ? sprintsRes.data : sprintsRes.data?.results || [];
      setSprints(sprintList);
      const init = {};
      sprintList.forEach((s) => { init[`sprint-${s.id}`] = true; });
      init.backlog = true;
      setOpenSections((prev) => ({ ...init, ...prev }));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load backlog");
    } finally {
      setLoading(false);
    }
  };

  const moveIssueToSprint = async (issue, sprintId) => {
    try {
      await api.put(`/api/agile/issues/${issue.id}/`, { sprint_id: sprintId });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to move issue");
    }
  };

  const handleDragStart = (issue) => (e) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (target) => (e) => {
    e.preventDefault();
    setDropTarget(target);
  };

  const handleDrop = (target) => async (e) => {
    e.preventDefault();
    if (!draggedIssue) return;
    if (target === "backlog") {
      await moveIssueToSprint(draggedIssue, null);
    } else if (typeof target === "number") {
      await moveIssueToSprint(draggedIssue, target);
    }
    setDraggedIssue(null);
    setDropTarget(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post(`/api/agile/projects/${projectId}/issues/`, form);
      setShowCreate(false);
      setForm({ title: "", issue_type: "story", priority: "medium" });
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to create issue");
    } finally {
      setCreating(false);
    }
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sprintIssuesFor = (sprintId) => backlogIssues.filter(() => false); // backlogIssues filtered to none-sprint
  // sprintIssues come from sprints response if returned with issues
  const sprintWithIssues = useMemo(() => sprints.map((s) => ({ ...s, issues: s.issues || [] })), [sprints]);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[
          { label: "Projects", to: "/projects" },
          { label: "Project", to: `/projects/${projectId}` },
          { label: "Backlog" },
        ]}
        title="Backlog"
        subtitle="Plan upcoming sprints and shape new work."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowCreate(true)}>
            Create issue
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 80, background: "var(--n20)", borderRadius: 4, marginBottom: 8 }} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {sprintWithIssues.map((sprint) => {
            const key = `sprint-${sprint.id}`;
            const open = !!openSections[key];
            const issues = sprint.issues || [];
            const isActive = String(sprint.status || "").toLowerCase() === "active" || sprint.is_active;
            return (
              <SectionPanel
                key={key}
                open={open}
                onToggle={() => toggleSection(key)}
                title={sprint.name}
                lozenge={isActive ? <Lozenge variant="inprogress">Active</Lozenge> : <Lozenge>Planned</Lozenge>}
                meta={`${issues.length} issue${issues.length === 1 ? "" : "s"}`}
                dropActive={dropTarget === sprint.id}
                onDragOver={handleDragOver(sprint.id)}
                onDrop={handleDrop(sprint.id)}
                action={isActive ? null : <Button appearance="default" size="sm">Start sprint</Button>}
              >
                {issues.length === 0 ? (
                  <div style={emptyRow}>Drop issues here to plan this sprint.</div>
                ) : (
                  issues.map((iss) => (
                    <IssueRow
                      key={iss.id}
                      issue={iss}
                      onClick={() => navigate(`/issues/${iss.id}`)}
                      onDragStart={handleDragStart(iss)}
                    />
                  ))
                )}
              </SectionPanel>
            );
          })}

          <SectionPanel
            open={!!openSections.backlog}
            onToggle={() => toggleSection("backlog")}
            title="Backlog"
            meta={`${backlogIssues.length} issue${backlogIssues.length === 1 ? "" : "s"}`}
            dropActive={dropTarget === "backlog"}
            onDragOver={handleDragOver("backlog")}
            onDrop={handleDrop("backlog")}
          >
            {backlogIssues.length === 0 ? (
              <EmptyState
                title="Backlog is empty"
                description="Create an issue or move one from an active sprint."
                primaryAction={<Button appearance="primary" onClick={() => setShowCreate(true)}>Create issue</Button>}
              />
            ) : (
              backlogIssues.map((iss) => (
                <IssueRow
                  key={iss.id}
                  issue={iss}
                  onClick={() => navigate(`/issues/${iss.id}`)}
                  onDragStart={handleDragStart(iss)}
                />
              ))
            )}
          </SectionPanel>
        </div>
      )}

      {showCreate ? (
        <Modal title="Create issue" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Type">
                <select value={form.issue_type} onChange={(e) => setForm({ ...form, issue_type: e.target.value })} className="atlas-input">
                  {["story", "task", "bug", "epic"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="atlas-input">
                  {["lowest", "low", "medium", "high", "highest"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={creating || !form.title.trim()}>{creating ? "Creating…" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function SectionPanel({ open, onToggle, title, lozenge, meta, action, children, dropActive, onDragOver, onDrop }) {
  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        background: "var(--app-surface)",
        border: "1px solid var(--app-border)",
        borderRadius: 4,
        outline: dropActive ? "2px solid var(--b400)" : "none",
        outlineOffset: -2,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "10px 16px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {open ? <ChevronDownIcon style={{ width: 14, height: 14, color: "var(--app-muted)" }} /> : <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--app-muted)" }} />}
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>{title}</span>
          {lozenge}
          <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{meta}</span>
        </span>
        {action}
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}

function IssueRow({ issue, onClick, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        borderTop: "1px solid var(--app-border-subtle)",
        cursor: "pointer",
      }}
    >
      {typeBadge(issue.issue_type || issue.type)}
      <span style={keyChip}>{issue.key || `#${issue.id}`}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--app-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {issue.title || issue.summary}
      </span>
      <Lozenge status={issue.status} />
      {priorityIcon(issue.priority)}
      {issue.story_points ? <span style={storyPoints}>{issue.story_points}</span> : null}
      <Avatar size="sm" name={issue.assignee_name || "Unassigned"} src={issue.assignee_avatar} />
    </div>
  );
}

function Modal({ children, onClose, title, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width, maxWidth: "calc(100vw - 32px)", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

const keyChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 18,
  padding: "0 6px",
  background: "var(--n20)",
  border: "1px solid var(--app-border-subtle)",
  borderRadius: 3,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--app-muted)",
  fontWeight: 600,
};

const storyPoints = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 20,
  height: 20,
  padding: "0 6px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--n700)",
  background: "var(--n30)",
  borderRadius: 10,
};

const emptyRow = {
  padding: "16px",
  textAlign: "center",
  fontSize: 13,
  color: "var(--app-text-disabled)",
  borderTop: "1px solid var(--app-border-subtle)",
};
