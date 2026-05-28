import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  IconButton,
  Lozenge,
  SectionMessage,
} from "./atlas";

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "testing", label: "Testing" },
  { value: "done", label: "Done" },
];

const PRIORITIES = ["lowest", "low", "medium", "high", "highest"];

function formatLabel(value) {
  return value ? String(value).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "—";
}

/**
 * IssueDetail — slide-over Jira issue panel.
 * Used by KanbanBoard. The full-page version lives at pages/IssueDetail.js.
 */
function IssueDetail({ issueId, onClose, onUpdate }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchIssue();
    fetchTeam();
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issueId]);

  useEffect(() => {
    if (issue?.project_id) fetchSprints(issue.project_id);
  }, [issue?.project_id]);

  const fetchIssue = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/api/agile/issues/${issueId}/`);
      setIssue(data);
      setTitleDraft(data?.title || "");
      setDescDraft(data?.description || "");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load issue");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const { data } = await api.get("/api/auth/team/");
      setTeamMembers(Array.isArray(data) ? data : data?.results || []);
    } catch (_) {}
  };

  const fetchSprints = async (projectId) => {
    try {
      const { data } = await api.get(`/api/agile/projects/${projectId}/sprints/`);
      setSprints(Array.isArray(data) ? data : data?.results || []);
    } catch (_) {}
  };

  const patch = async (payload) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, payload);
      await fetchIssue();
      onUpdate?.();
      setOpenSelect(null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Update failed");
    }
  };

  const submitComment = async (e) => {
    e?.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/agile/issues/${issueId}/comments/`, { body: comment.trim() });
      setComment("");
      await fetchIssue();
    } catch (err) {
      setError(err?.response?.data?.detail || "Comment failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SlideOver onClose={onClose}><div style={{ padding: 32 }}>Loading…</div></SlideOver>;
  }
  if (!issue) return null;

  const assigneeName = issue.assignee_name || issue.assignee || "Unassigned";

  return (
    <SlideOver onClose={onClose}>
      <header style={panelHeader}>
        <Breadcrumb
          items={[
            { label: "Projects", to: "/projects" },
            { label: issue.project_name || issue.project_slug || "Project" },
            { label: issue.key || `#${issue.id}` },
          ]}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button appearance="subtle" iconBefore={<ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />}
            onClick={() => { window.location.href = `/issues/${issueId}`; }}
          >
            Open full view
          </Button>
          <Button appearance="subtle" iconBefore={<EyeIcon style={{ width: 14, height: 14 }} />}>Watch</Button>
          <Button appearance="subtle" iconBefore={<ShareIcon style={{ width: 14, height: 14 }} />}>Share</Button>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
      </header>

      <div style={panelBody}>
        <section style={mainColumn}>
          {error ? <SectionMessage tone="error">{error}</SectionMessage> : null}

          {editingTitle ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="atlas-input"
                style={{ fontSize: 20, height: 40 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { patch({ title: titleDraft }); setEditingTitle(false); }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <Button appearance="primary" onClick={() => { patch({ title: titleDraft }); setEditingTitle(false); }}>
                <CheckIcon style={{ width: 14, height: 14 }} />
              </Button>
            </div>
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              style={{ ...issueTitle, cursor: "text" }}
              title="Click to edit"
            >
              {issue.title}
            </h1>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button appearance="default" size="sm" iconBefore={<span style={{ fontSize: 12 }}>+</span>}>Attach</Button>
            <Button appearance="default" size="sm">Add a child issue</Button>
            <Button appearance="default" size="sm">Link issue</Button>
          </div>

          <FieldBlock label="Description">
            {editingDescription ? (
              <>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  className="atlas-input"
                  rows={6}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button appearance="primary" onClick={() => { patch({ description: descDraft }); setEditingDescription(false); }}>Save</Button>
                  <Button appearance="subtle" onClick={() => { setDescDraft(issue.description || ""); setEditingDescription(false); }}>Cancel</Button>
                </div>
              </>
            ) : (
              <div
                onClick={() => setEditingDescription(true)}
                style={{
                  padding: "8px 0",
                  fontSize: 14,
                  lineHeight: 1.4286,
                  color: issue.description ? "var(--app-text)" : "var(--app-text-disabled)",
                  cursor: "text",
                  whiteSpace: "pre-wrap",
                  minHeight: 32,
                }}
              >
                {issue.description || "Add a description…"}
              </div>
            )}
          </FieldBlock>

          <FieldBlock label="Activity">
            <div className="atlas-tab-row" style={{ marginBottom: 12 }}>
              <button className="atlas-tab" aria-selected="true">Comments</button>
              <button className="atlas-tab">History</button>
              <button className="atlas-tab">Worklog</button>
            </div>
            <form onSubmit={submitComment} style={{ marginBottom: 16 }}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="atlas-input"
                rows={3}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button type="button" appearance="subtle" onClick={() => setComment("")}>Cancel</Button>
                <Button appearance="primary" type="submit" isDisabled={submitting || !comment.trim()}>
                  {submitting ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
            <div>
              {(issue.comments || []).map((c) => (
                <div key={c.id} style={commentItem}>
                  <Avatar name={c.author_name || c.author || "User"} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{c.author_name || c.author || "User"}</strong>
                      <span style={{ color: "var(--app-muted)", marginLeft: 8 }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--app-text)" }}>{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </FieldBlock>
        </section>

        <aside style={sideColumn}>
          <DetailField label="Status">
            <SelectButton
              value={formatLabel(issue.status)}
              isOpen={openSelect === "status"}
              onToggle={() => setOpenSelect(openSelect === "status" ? null : "status")}
              renderValue={() => <Lozenge status={issue.status} />}
            >
              {STATUS_OPTIONS.map((opt) => (
                <SelectOption key={opt.value} onSelect={() => patch({ status: opt.value })}>
                  <Lozenge status={opt.value} />
                </SelectOption>
              ))}
            </SelectButton>
          </DetailField>

          <DetailField label="Assignee">
            <SelectButton
              value={assigneeName}
              isOpen={openSelect === "assignee"}
              onToggle={() => setOpenSelect(openSelect === "assignee" ? null : "assignee")}
              renderValue={() => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={assigneeName} size="sm" />
                  <span>{assigneeName}</span>
                </span>
              )}
            >
              <SelectOption onSelect={() => patch({ assignee_id: null })}>Unassigned</SelectOption>
              {teamMembers.map((m) => (
                <SelectOption key={m.id} onSelect={() => patch({ assignee_id: m.id })}>
                  <Avatar name={m.full_name || m.email || ""} size="sm" />
                  <span>{m.full_name || m.email}</span>
                </SelectOption>
              ))}
            </SelectButton>
          </DetailField>

          <DetailField label="Reporter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Avatar name={issue.reporter_name || issue.reporter || "—"} size="sm" />
              {issue.reporter_name || issue.reporter || "—"}
            </span>
          </DetailField>

          <DetailField label="Priority">
            <SelectButton
              value={formatLabel(issue.priority)}
              isOpen={openSelect === "priority"}
              onToggle={() => setOpenSelect(openSelect === "priority" ? null : "priority")}
            >
              {PRIORITIES.map((p) => (
                <SelectOption key={p} onSelect={() => patch({ priority: p })}>
                  {formatLabel(p)}
                </SelectOption>
              ))}
            </SelectButton>
          </DetailField>

          <DetailField label="Labels">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(issue.labels || []).map((l) => (
                <Lozenge key={l} variant="default">{l}</Lozenge>
              ))}
              {!(issue.labels || []).length ? <span style={mutedValue}>None</span> : null}
            </div>
          </DetailField>

          <DetailField label="Sprint">
            <SelectButton
              value={issue.sprint_name || "None"}
              isOpen={openSelect === "sprint"}
              onToggle={() => setOpenSelect(openSelect === "sprint" ? null : "sprint")}
            >
              <SelectOption onSelect={() => patch({ sprint_id: null })}>None</SelectOption>
              {sprints.map((s) => (
                <SelectOption key={s.id} onSelect={() => patch({ sprint_id: s.id })}>
                  {s.name}
                </SelectOption>
              ))}
            </SelectButton>
          </DetailField>

          <DetailField label="Story points">
            <input
              type="number"
              defaultValue={issue.story_points || ""}
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v !== issue.story_points) patch({ story_points: v });
              }}
              className="atlas-input"
              style={{ width: 80 }}
            />
          </DetailField>

          <DetailField label="Due date">
            <input
              type="date"
              defaultValue={issue.due_date ? String(issue.due_date).slice(0, 10) : ""}
              onChange={(e) => patch({ due_date: e.target.value || null })}
              className="atlas-input"
              style={{ width: 160 }}
            />
          </DetailField>

          <div style={createdMeta}>
            <p>Created {issue.created_at ? new Date(issue.created_at).toLocaleString() : "—"}</p>
            <p>Updated {issue.updated_at ? new Date(issue.updated_at).toLocaleString() : "—"}</p>
          </div>
        </aside>
      </div>
    </SlideOver>
  );
}

function SlideOver({ children, onClose }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--app-overlay)",
          zIndex: 199,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(1100px, 100vw)",
          background: "var(--app-surface)",
          borderLeft: "1px solid var(--app-border)",
          boxShadow: "var(--ui-shadow-lg)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </aside>
    </>
  );
}

function FieldBlock({ label, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <p style={fieldLabelInline}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function DetailField({ label, children }) {
  return (
    <div style={detailRow}>
      <p style={detailLabel}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function SelectButton({ value, renderValue, isOpen, onToggle, children }) {
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={onToggle} style={selectButtonStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {renderValue ? renderValue() : value}
        </span>
        <ChevronDownIcon style={{ width: 12, height: 12, color: "var(--app-muted)", flexShrink: 0 }} />
      </button>
      {isOpen ? <div style={selectMenu}>{children}</div> : null}
    </div>
  );
}

function SelectOption({ children, onSelect }) {
  return (
    <button type="button" onClick={onSelect} style={selectOption}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{children}</span>
    </button>
  );
}

const panelHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "12px 24px",
  borderBottom: "1px solid var(--app-border)",
  flexShrink: 0,
};

const panelBody = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  overflowY: "auto",
};

const mainColumn = {
  padding: "20px 32px",
  borderRight: "1px solid var(--app-border-subtle)",
  minWidth: 0,
};

const sideColumn = {
  padding: "20px 24px",
  background: "var(--app-surface)",
};

const issueTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 500,
  color: "var(--app-text)",
  letterSpacing: "-0.008em",
};

const fieldLabelInline = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--app-muted)",
};

const detailRow = {
  display: "grid",
  gridTemplateColumns: "100px 1fr",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
};

const detailLabel = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-muted)",
  fontWeight: 500,
};

const mutedValue = {
  color: "var(--app-text-disabled)",
  fontSize: 13,
};

const selectButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  width: "100%",
  height: 28,
  padding: "0 6px",
  background: "transparent",
  border: "2px solid transparent",
  borderRadius: 3,
  color: "var(--app-text)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const selectMenu = {
  position: "absolute",
  top: "calc(100% + 2px)",
  left: 0,
  right: 0,
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  boxShadow: "var(--ui-shadow-md)",
  padding: 4,
  zIndex: 50,
  maxHeight: 240,
  overflowY: "auto",
};

const selectOption = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: 3,
  fontSize: 13,
  color: "var(--app-text)",
  fontFamily: "inherit",
};

const commentItem = {
  display: "flex",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid var(--app-border-subtle)",
};

const createdMeta = {
  marginTop: 24,
  paddingTop: 12,
  borderTop: "1px solid var(--app-border-subtle)",
  fontSize: 12,
  color: "var(--app-muted)",
};

export default IssueDetail;
