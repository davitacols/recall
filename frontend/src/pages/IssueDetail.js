import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  LinkIcon,
  PaperClipIcon,
  PencilIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Breadcrumb,
  Button,
  Field,
  IconButton,
  Lozenge,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint, useAgentDock } from "../components/AgentDock";

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
  const agentDock = useAgentDock();
  const [issue, setIssue] = useState(null);
  // Hook must be called unconditionally — pass null until the issue loads.
  useAgentContextHint(
    issue
      ? {
          kind: "issue",
          label: `${issue.key || `#${issue.id}`} · ${issue.title || ""}`.trim(),
          goalPrefix: `Issue ${issue.key || `#${issue.id}`} "${issue.title || ""}" — `,
          profile_slug: "general",
        }
      : null
  );
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
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [childForm, setChildForm] = useState({ title: "", issue_type: "subtask" });
  const [creatingChild, setCreatingChild] = useState(false);
  const [showLinkIssue, setShowLinkIssue] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetchIssue();
    fetchAttachments();
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

  // ---- Attachments ----
  const fetchAttachments = async () => {
    try {
      const { data } = await api.get(`/api/agile/issues/${issueId}/attachments/list/`);
      setAttachments(Array.isArray(data) ? data : data?.results || []);
    } catch (_) {
      // optional surface; ignore failure silently
    }
  };

  const triggerAttachPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/api/agile/issues/${issueId}/attachments/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchAttachments();
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Delete this attachment?")) return;
    try {
      await api.delete(`/api/agile/attachments/${attachmentId}/`);
      await fetchAttachments();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete");
    }
  };

  // ---- Child issue ----
  const handleCreateChild = async (e) => {
    e?.preventDefault();
    if (!childForm.title.trim() || !issue?.project_id) return;
    setCreatingChild(true);
    setError("");
    try {
      await api.post(`/api/agile/projects/${issue.project_id}/issues/`, {
        title: childForm.title.trim(),
        issue_type: childForm.issue_type || "subtask",
        priority: "medium",
        parent_issue: Number(issueId),
        parent_issue_id: Number(issueId),
      });
      setShowCreateChild(false);
      setChildForm({ title: "", issue_type: "subtask" });
      await fetchIssue();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not create child issue"
      );
    } finally {
      setCreatingChild(false);
    }
  };

  // ---- Link issue ----
  // Backend has no native issue-to-issue link endpoint, so we fall through to a
  // structured comment that other surfaces can parse. Validate the target exists
  // first so we don't post broken links.
  const parseLinkTarget = (raw) => {
    const value = String(raw || "").trim();
    if (!value) return null;
    const urlMatch = value.match(/\/issues\/(\d+)/);
    if (urlMatch) return { kind: "id", value: urlMatch[1], display: `#${urlMatch[1]}` };
    if (/^https?:\/\//i.test(value)) return { kind: "url", value, display: value };
    if (/^\d+$/.test(value)) return { kind: "id", value, display: `#${value}` };
    return { kind: "key", value, display: value.toUpperCase() };
  };

  const handleLinkIssue = async (e) => {
    e?.preventDefault();
    const target = parseLinkTarget(linkInput);
    if (!target) return;
    setLinking(true);
    setError("");
    try {
      if (target.kind === "id") {
        // Validate by fetching the issue first so we don't post a phantom link
        await api.get(`/api/agile/issues/${target.value}/`);
      }
      const body =
        target.kind === "url"
          ? `Linked: ${target.value}`
          : `Linked to issue ${target.display}`;
      await api.post(`/api/agile/issues/${issueId}/comments/`, { body });
      setShowLinkIssue(false);
      setLinkInput("");
      await fetchIssue();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          (err?.response?.status === 404
            ? "That issue couldn't be found in this workspace."
            : err?.message || "Could not link issue")
      );
    } finally {
      setLinking(false);
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
        <Button
          appearance="subtle"
          iconBefore={<BoltIcon style={{ width: 14, height: 14 }} />}
          onClick={() => agentDock.open()}
          title="Ask the agent about this issue (⌘J)"
        >
          Ask Agent
        </Button>
        <Button appearance="subtle" iconBefore={<EyeIcon style={{ width: 14, height: 14 }} />}>Watch</Button>
        <Button appearance="subtle" iconBefore={<ShareIcon style={{ width: 14, height: 14 }} />}>Share</Button>
      </div>

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      <div style={pageGrid}>
        <section style={mainCard}>
          <div style={issueMetaRow}>
            <span style={issueKeyChip}>{issue.key || `#${issue.id}`}</span>
            <Lozenge status={issue.status} />
            <span style={issueTypeMeta}>{formatLabel(issue.priority)} priority</span>
          </div>
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
                fontSize: 26,
                fontWeight: 640,
                lineHeight: 1.2,
                color: "var(--app-text)",
                letterSpacing: "-0.025em",
                cursor: "text",
              }}
            >
              {issue.title}
            </h1>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button
              appearance="default"
              size="sm"
              iconBefore={<PaperClipIcon style={{ width: 14, height: 14 }} />}
              onClick={triggerAttachPicker}
              isDisabled={uploading}
            >
              {uploading ? "Uploading…" : "Attach"}
            </Button>
            <Button
              appearance="default"
              size="sm"
              iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
              onClick={() => setShowCreateChild(true)}
            >
              Add a child issue
            </Button>
            <Button
              appearance="default"
              size="sm"
              iconBefore={<LinkIcon style={{ width: 14, height: 14 }} />}
              onClick={() => setShowLinkIssue(true)}
            >
              Link issue
            </Button>
          </div>

          <FieldBlock label="Description">
            {editingDescription ? (
              <>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  className="atlas-input"
                  rows={8}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Button appearance="primary" onClick={() => { patch({ description: descDraft }); setEditingDescription(false); }}>Save</Button>
                  <Button appearance="subtle" onClick={() => { setDescDraft(issue.description || ""); setEditingDescription(false); }}>Cancel</Button>
                </div>
              </>
            ) : issue.description ? (
              <div
                onClick={() => setEditingDescription(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingDescription(true); }}
                style={descriptionFilledStyle}
              >
                {issue.description}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDescription(true)}
                style={descriptionEmptyStyle}
              >
                <PencilIcon style={{ width: 14, height: 14, color: "var(--app-muted)" }} />
                <span>Add a description…</span>
              </button>
            )}
          </FieldBlock>

          {attachments.length > 0 ? (
            <FieldBlock label={`Attachments (${attachments.length})`}>
              <ul style={attachmentsList}>
                {attachments.map((a) => (
                  <li key={a.id} style={attachmentRow}>
                    <PaperClipIcon style={{ width: 14, height: 14, color: "var(--app-muted)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {a.file_url || a.url ? (
                        <a
                          href={a.file_url || a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={attachmentLink}
                        >
                          {a.file_name || a.name || "Attachment"}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--app-text)" }}>{a.file_name || "Attachment"}</span>
                      )}
                      <span style={attachmentMeta}>
                        {a.uploaded_by_name || a.uploader_name || ""}
                        {a.created_at ? ` · ${new Date(a.created_at).toLocaleDateString()}` : ""}
                        {a.file_size ? ` · ${formatBytes(a.file_size)}` : ""}
                      </span>
                    </div>
                    <IconButton
                      icon={<TrashIcon style={{ width: 14, height: 14 }} />}
                      label="Delete attachment"
                      size={24}
                      onClick={() => handleDeleteAttachment(a.id)}
                    />
                  </li>
                ))}
              </ul>
            </FieldBlock>
          ) : null}

          {Array.isArray(issue.subtasks) && issue.subtasks.length > 0 ? (
            <FieldBlock label={`Child issues (${issue.subtasks.length})`}>
              <ul style={subtaskList}>
                {issue.subtasks.map((s) => (
                  <li key={s.id} style={subtaskRow}>
                    <Link to={`/issues/${s.id}`} style={subtaskLink}>
                      <span style={issueKeyChip}>{s.key || `#${s.id}`}</span>
                      <span style={subtaskTitle}>{s.title || s.summary || "Untitled"}</span>
                    </Link>
                    {s.status ? <Lozenge status={s.status} /> : null}
                    {s.assignee_name ? (
                      <Avatar size="sm" name={s.assignee_name} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </FieldBlock>
          ) : null}

          <FieldBlock label="Activity">
            <div className="atlas-tab-row" style={{ marginBottom: 12 }}>
              <button className="atlas-tab atlas-tab--active" role="tab" aria-controls="tab-comments">Comments</button>
              <button className="atlas-tab" role="tab" aria-controls="tab-history">History</button>
              <button className="atlas-tab" role="tab" aria-controls="tab-worklog">Worklog</button>
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

      {showCreateChild ? (
        <Modal title="Add a child issue" onClose={() => setShowCreateChild(false)}>
          <form onSubmit={handleCreateChild} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input
                value={childForm.title}
                onChange={(e) => setChildForm({ ...childForm, title: e.target.value })}
                className="atlas-input"
                required
                autoFocus
              />
            </Field>
            <Field label="Type">
              <select
                value={childForm.issue_type}
                onChange={(e) => setChildForm({ ...childForm, issue_type: e.target.value })}
                className="atlas-input"
              >
                <option value="subtask">Subtask</option>
                <option value="task">Task</option>
                <option value="story">Story</option>
                <option value="bug">Bug</option>
              </select>
            </Field>
            <p style={{ margin: 0, fontSize: 12, color: "var(--app-muted)" }}>
              Will be created under <strong style={{ color: "var(--app-text)" }}>{issue.key || `#${issue.id}`}</strong>.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreateChild(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                appearance="primary"
                isDisabled={creatingChild || !childForm.title.trim()}
              >
                {creatingChild ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showLinkIssue ? (
        <Modal title="Link an issue or URL" onClose={() => setShowLinkIssue(false)}>
          <form onSubmit={handleLinkIssue} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field
              label="Issue key, ID, or URL"
              isRequired
              helpText="Example: RECL-42, 128, or https://…"
            >
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="atlas-input"
                placeholder="RECL-42"
                autoFocus
                required
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowLinkIssue(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" isDisabled={linking || !linkInput.trim()}>
                {linking ? "Linking…" : "Link"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, onClose, title, width = 480 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
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
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  gap: 24,
  alignItems: "start",
};

const mainCard = {
  minWidth: 0,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 16,
  padding: 28,
  boxShadow: "var(--ui-shadow-sm)",
};

const issueMetaRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
};

const issueKeyChip = {
  display: "inline-flex",
  alignItems: "center",
  height: 20,
  padding: "0 8px",
  borderRadius: 6,
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border-subtle)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--app-text-subtle)",
};

const issueTypeMeta = {
  fontSize: 12.5,
  color: "var(--app-muted)",
  fontWeight: 500,
};

const sidePanel = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 16,
  padding: 18,
  position: "sticky",
  top: 76,
  boxShadow: "var(--ui-shadow-sm)",
};

const panelTitle = {
  margin: "0 0 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--app-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
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
  height: 32,
  padding: "0 8px",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 8,
  color: "var(--app-text)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 120ms ease, border-color 120ms ease",
};

const selectMenuStyle = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  boxShadow: "var(--ui-shadow-lg)",
  padding: 6,
  zIndex: 50,
  maxHeight: 240,
  overflowY: "auto",
};

const selectOptionStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "7px 9px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  borderRadius: 7,
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

const descriptionFilledStyle = {
  padding: "10px 12px",
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--app-text)",
  whiteSpace: "pre-wrap",
  cursor: "text",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid transparent",
  transition: "background 120ms ease, border-color 120ms ease",
};

const descriptionEmptyStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--app-muted)",
  background: "transparent",
  border: "1px dashed var(--app-border)",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
};

const attachmentsList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const attachmentRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border-subtle)",
};

const attachmentLink = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--app-link)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const attachmentMeta = {
  display: "block",
  fontSize: 11,
  color: "var(--app-muted)",
  marginTop: 2,
};

const subtaskList = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const subtaskRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 8,
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border-subtle)",
};

const subtaskLink = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  color: "inherit",
  textDecoration: "none",
};

const subtaskTitle = {
  fontSize: 13,
  color: "var(--app-text)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "var(--app-overlay)",
  zIndex: 199,
};

const modalShell = {
  position: "fixed",
  top: "10vh",
  left: "50%",
  transform: "translateX(-50%)",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  background: "var(--app-surface-overlay)",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  boxShadow: "var(--ui-shadow-lg)",
  zIndex: 200,
  overflow: "hidden",
};

const modalHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--app-border)",
};
