import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Breadcrumb,
  Button,
  Field,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint } from "../components/AgentDock";

const DOC_TYPES = [
  { id: "policy", label: "Policy" },
  { id: "procedure", label: "Procedure" },
  { id: "guide", label: "Guide" },
  { id: "report", label: "Report" },
  { id: "other", label: "Other" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function deriveHeadings(html) {
  if (!html) return [];
  const headings = [];
  const re = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = re.exec(html))) {
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (text) headings.push({ level: Number(match[1]), text });
  }
  return headings;
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const apiBase = process.env.REACT_APP_API_URL || "";

  const [doc, setDoc] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", document_type: "other", content: "" });
  const [fileUrl, setFileUrl] = useState("");
  const [busy, setBusy] = useState(false);

  // Frame the agent dock around this page. Doc Drafter is the natural
  // specialist — summarize, draft follow-ups, generate updates.
  useAgentContextHint(
    doc
      ? {
          kind: "document",
          label: `Page · ${doc.title || `#${id}`}`,
          goalPrefix: `Page "${doc.title || `#${id}`}" — `,
          profile_slug: "doc-drafter",
        }
      : null
  );

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchDocument();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const fetchDocument = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load document");
      const data = await res.json();
      setDoc(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        document_type: data.document_type || "other",
        content: data.content || "",
      });
      if (data.has_file) {
        const fileRes = await fetch(`${apiBase}/api/business/documents/${id}/file/`, { headers: authHeaders() });
        if (fileRes.ok) {
          const blob = await fileRes.blob();
          if (fileUrl) URL.revokeObjectURL(fileUrl);
          setFileUrl(URL.createObjectURL(blob));
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load document");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`${apiBase}/api/business/documents/${id}/comments/`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${apiBase}/api/business/documents/${id}/comments/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const data = await res.json();
      setComments((c) => [...c, data]);
      setNewComment("");
      toast.success?.("Comment added");
    } catch (err) {
      toast.error?.(err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update document");
      setEditing(false);
      await fetchDocument();
      toast.success?.("Page updated");
    } catch (err) {
      toast.error?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this page?")) return;
    try {
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success?.("Page deleted");
      navigate("/business/documents");
    } catch (err) {
      toast.error?.(err.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await fetch(`${apiBase}/api/organizations/pdf/document/${id}/`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to export PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${doc?.title || "document"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success?.("PDF downloaded");
    } catch (err) {
      toast.error?.(err.message);
    }
  };

  const headings = useMemo(() => deriveHeadings(doc?.content || ""), [doc?.content]);

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading page…</div>;
  }
  if (!doc) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Page not found">
          {error || "We couldn't find that page."}
        </SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[
          { label: "Knoledgr", to: "/" },
          { label: "Pages", to: "/business/documents" },
          { label: doc.title || "Untitled" },
        ]}
        title={doc.title || "Untitled"}
        subtitle={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Avatar size="sm" name={doc.created_by_name || doc.owner || "User"} />
            <span>{doc.created_by_name || doc.owner || "Unknown"}</span>
            <span style={{ color: "var(--app-text-disabled)" }}>·</span>
            <span>Last updated {formatDate(doc.updated_at || doc.created_at)}</span>
            <Lozenge>{doc.document_type || "other"}</Lozenge>
          </span>
        }
        actions={
          editing ? (
            <>
              <Button appearance="subtle" onClick={() => setEditing(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} isDisabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </>
          ) : (
            <>
              <Button appearance="subtle" iconBefore={<EyeIcon style={{ width: 14, height: 14 }} />}>Watch</Button>
              <Button appearance="subtle" iconBefore={<ShareIcon style={{ width: 14, height: 14 }} />}>Share</Button>
              <Button appearance="subtle" iconBefore={<ArrowDownTrayIcon style={{ width: 14, height: 14 }} />} onClick={handleExportPDF}>
                Export PDF
              </Button>
              <Button appearance="default" iconBefore={<PencilIcon style={{ width: 14, height: 14 }} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </>
          )
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={pageGrid}>
        <article style={articleColumn}>
          {editing ? (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Title" isRequired>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required />
              </Field>
              <Field label="Description">
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" />
              </Field>
              <Field label="Type">
                <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="atlas-input">
                  {DOC_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Content" helpText="HTML or plain text. A rich editor will land here in a later pass.">
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="atlas-input" rows={18} />
              </Field>
            </form>
          ) : (
            <>
              {doc.description ? (
                <p style={{ margin: "0 0 16px", fontSize: 16, color: "var(--app-muted)", lineHeight: 1.5 }}>{doc.description}</p>
              ) : null}
              {doc.has_file && fileUrl ? (
                <div style={{ marginBottom: 24, border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" }}>
                  {doc.file_type?.includes("pdf") ? (
                    <iframe src={fileUrl} title={doc.file_name || "Attached file"} style={{ width: "100%", height: 480, border: "none", background: "var(--n10)" }} />
                  ) : (
                    <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontWeight: 600 }}>{doc.file_name}</span>
                      <Button appearance="subtle" size="sm" onClick={() => window.open(fileUrl)}>Open</Button>
                    </div>
                  )}
                </div>
              ) : null}
              {doc.content ? (
                <div className="atlas-article" dangerouslySetInnerHTML={{ __html: doc.content }} />
              ) : (
                <p style={{ color: "var(--app-text-disabled)", fontSize: 14 }}>This page has no content yet.</p>
              )}
            </>
          )}

          <section style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--app-border-subtle)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>
              Comments
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--app-muted)" }}>{comments.length}</span>
            </h2>
            <form onSubmit={handleAddComment} style={{ marginBottom: 16 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a comment…"
                className="atlas-input"
                rows={3}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <Button appearance="primary" type="submit" isDisabled={!newComment.trim()}>Save</Button>
              </div>
            </form>
            <div>
              {comments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--app-border-subtle)" }}>
                  <Avatar size="sm" name={c.author_name || c.user_name || "User"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>
                      <strong>{c.author_name || c.user_name || "User"}</strong>
                      <span style={{ marginLeft: 8, color: "var(--app-muted)" }}>{formatDate(c.created_at)}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--app-text)", whiteSpace: "pre-wrap" }}>
                      {c.content || c.body}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 ? <p style={{ fontSize: 13, color: "var(--app-muted)" }}>No comments yet.</p> : null}
            </div>
          </section>
        </article>

        <aside style={sidePanel}>
          <div style={{ padding: 16 }}>
            <h3 style={panelTitle}>Page info</h3>
            <DetailRow label="Type" value={<Lozenge>{doc.document_type || "other"}</Lozenge>} />
            <DetailRow label="Author" value={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Avatar size="sm" name={doc.created_by_name || doc.owner || ""} />
                <span style={{ fontSize: 13 }}>{doc.created_by_name || doc.owner || "—"}</span>
              </span>
            } />
            <DetailRow label="Created" value={<span style={{ fontSize: 13, color: "var(--app-text)" }}>{formatDate(doc.created_at)}</span>} />
            <DetailRow label="Updated" value={<span style={{ fontSize: 13, color: "var(--app-text)" }}>{formatDate(doc.updated_at)}</span>} />
            {Array.isArray(doc.tags) && doc.tags.length ? (
              <DetailRow
                label="Tags"
                value={
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {doc.tags.map((t) => <Lozenge key={t}>{t}</Lozenge>)}
                  </div>
                }
              />
            ) : null}
          </div>

          {headings.length ? (
            <div style={{ padding: "0 16px 16px" }}>
              <h3 style={{ ...panelTitle, marginBottom: 4 }}>On this page</h3>
              <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {headings.map((h, i) => (
                  <span key={i} style={{ fontSize: 13, color: "var(--app-muted)", paddingLeft: (h.level - 1) * 12 }}>
                    {h.text}
                  </span>
                ))}
              </nav>
            </div>
          ) : null}

          <div style={{ padding: 16, borderTop: "1px solid var(--app-border-subtle)" }}>
            <Button appearance="danger" size="sm" iconBefore={<TrashIcon style={{ width: 12, height: 12 }} />} onClick={handleDelete}>
              Delete page
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", alignItems: "center", padding: "6px 0", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{label}</span>
      <div>{value}</div>
    </div>
  );
}

const pageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 280px",
  gap: 32,
  marginTop: 16,
  alignItems: "start",
};

const articleColumn = {
  maxWidth: 760,
  fontSize: 15,
  lineHeight: 1.55,
  color: "var(--app-text)",
};

const sidePanel = {
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
};

const panelTitle = {
  margin: "0 0 8px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--app-muted)",
};
