import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Breadcrumb,
  Button,
  IconButton,
  Lozenge,
  SectionMessage,
} from "../components/atlas";

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

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [comment, setComment] = useState("");
  const [openSelect, setOpenSelect] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIssue();
    api.get("/api/auth/team/")
      .then((r) => setTeamMembers(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => {});
  }, [issueId]);

  useEffect(() => {
    if (issue?.project_id) {
      api.get(`/api/agile/projects/${issue.project_id}/sprints/`)
        .then((r) => setSprints(Array.isArray(r.data) ? r.data : r.data?.results || []))
        .catch(() => {});
    }
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

  const patch = async (payload) => {
    try {
      await api.put(`/api/agile/issues/${issueId}/`, payload);
      await fetchIssue();
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
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading issue…</div>;
  }
  if (!issue) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Issue not found">
          We couldn't find that issue.
        </SectionMessage>
      </div>
    );
  }

  const assigneeName = issue.assignee_name || issue.assignee || "Unassigned";

  return (
    <div style={{ padding: "24px 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <IconButton icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />} label="Back" onClick={() => navigate(-1)} />
        <Breadcrumb
          items={[
            { label: "Projects", to: "/projects" },
            { label: issue.project_name || issue.project_slug || "Project" },
            { label: issue.key || `#${issue.id}` },
          ]}
        />
      </div>

      <div style={pageActionsRow}>
        <span style={{ flex: 1 }} />
        <Button appearance="subtle" iconBefore={<EyeIcon style={{ width: 14, height: 14 }} />}>Watch</Button>
        <Button appearance="subtle" iconBefore={<ShareIcon style={{ width: 14, height: 14 }} />}>Share</Button>
      </div>

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      <div style={pageGrid}>
        <section style={{ minWidth: 0 }}>
          {editingTitle ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="atlas-input"
                style={{ fontSize: 24, height: 44 }}
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
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 500,
                lineHeight: 1.2,
                color: "var(--app-text)",
                letterSpacing: "-0.01em",
                cursor: "text",
              }}
            >
              {issue.title}
            </h1>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Button appearance="default" size="sm">Attach</Button>
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
                  rows={8}
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
                  whiteSpace: "pre-wrap",
                  cursor: "text",
                  minHeight: 40,
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
                <div key={c.id} style={commentItemStyle}>
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
              {!(issue.comments || []).length ? (
                <p style={{ color: "var(--app-muted)", fontSize: 13 }}>No comments yet.</p>
              ) : null}
            </div>
          </FieldBlock>
        </section>

        <aside style={sidePanel}>
          <h3 style={panelTitle}>Details</h3>

          <DetailRow label="Status">
            <SelectButton
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
          </DetailRow>

          <DetailRow label="Assignee">
            <SelectButton
              isOpen={openSelect === "assignee"}
              onToggle={() => setOpenSelect(openSelect === "assignee" ? null : "assignee")}
              renderValue={() => (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={assigneeName} size="sm" />
                  <span style={{ fontSize: 13 }}>{assigneeName}</span>
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
          </DetailRow>

          <DetailRow label="Reporter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <Avatar name={issue.reporter_name || issue.reporter || "—"} size="sm" />
              {issue.reporter_name || issue.reporter || "—"}
            </span>
          </DetailRow>

          <DetailRow label="Priority">
            <SelectButton
              isOpen={openSelect === "priority"}
              onToggle={() => setOpenSelect(openSelect === "priority" ? null : "priority")}
              renderValue={() => <span style={{ fontSize: 13 }}>{formatLabel(issue.priority)}</span>}
            >
              {PRIORITIES.map((p) => (
                <SelectOption key={p} onSelect={() => patch({ priority: p })}>
                  {formatLabel(p)}
                </SelectOption>
              ))}
            </SelectButton>
          </DetailRow>

          <DetailRow label="Labels">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(issue.labels || []).map((l) => (
                <Lozenge key={l}>{l}</Lozenge>
              ))}
              {!(issue.labels || []).length ? <span style={{ color: "var(--app-text-disabled)", fontSize: 13 }}>None</span> : null}
            </div>
          </DetailRow>

          <DetailRow label="Sprint">
            <SelectButton
              isOpen={openSelect === "sprint"}
              onToggle={() => setOpenSelect(openSelect === "sprint" ? null : "sprint")}
              renderValue={() => <span style={{ fontSize: 13 }}>{issue.sprint_name || "None"}</span>}
            >
              <SelectOption onSelect={() => patch({ sprint_id: null })}>None</SelectOption>
              {sprints.map((s) => (
                <SelectOption key={s.id} onSelect={() => patch({ sprint_id: s.id })}>
                  {s.name}
                </SelectOption>
              ))}
            </SelectButton>
          </DetailRow>

          <DetailRow label="Story points">
            <input
              type="number"
              defaultValue={issue.story_points || ""}
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v !== issue.story_points) patch({ story_points: v });
              }}
              className="atlas-input"
              style={{ width: 96 }}
            />
          </DetailRow>

          <DetailRow label="Due date">
            <input
              type="date"
              defaultValue={issue.due_date ? String(issue.due_date).slice(0, 10) : ""}
              onChange={(e) => patch({ due_date: e.target.value || null })}
              className="atlas-input"
              style={{ width: 160 }}
            />
          </DetailRow>

          <div style={createdMeta}>
            <p>Created {issue.created_at ? new Date(issue.created_at).toLocaleString() : "—"}</p>
            <p>Updated {issue.updated_at ? new Date(issue.updated_at).toLocaleString() : "—"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FieldBlock({ label, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <p style={fieldLabelStyle}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)", fontWeight: 500 }}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function SelectButton({ renderValue, isOpen, onToggle, children }) {
  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={onToggle} style={selectButtonStyle}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {renderValue ? renderValue() : null}
        </span>
        <ChevronDownIcon style={{ width: 12, height: 12, color: "var(--app-muted)", flexShrink: 0 }} />
      </button>
      {isOpen ? <div style={selectMenuStyle}>{children}</div> : null}
    </div>
  );
}

function SelectOption({ children, onSelect }) {
  return (
    <button type="button" onClick={onSelect} style={selectOptionStyle}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{children}</span>
    </button>
  );
}

const pageActionsRow = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginBottom: 16,
};

const pageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 32,
  alignItems: "start",
};

const sidePanel = {
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: "16px",
};

const panelTitle = {
  margin: "0 0 8px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--app-text)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fieldLabelStyle = {
  margin: "0 0 4px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--app-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
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

const selectMenuStyle = {
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

const selectOptionStyle = {
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

const commentItemStyle = {
  display: "flex",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid var(--app-border-subtle)",
};

const createdMeta = {
  marginTop: 16,
  paddingTop: 12,
  borderTop: "1px solid var(--app-border-subtle)",
  fontSize: 12,
  color: "var(--app-muted)",
};
