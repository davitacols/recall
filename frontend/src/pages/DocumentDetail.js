import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { useToast } from "../components/Toast";
import { MentionInput } from "../components/MentionInput";
import { AIEnhancementButton, AIResultsPanel } from "../components/AIEnhancements";
import { WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import RichTextEditor from "../components/RichTextEditor";
import RichTextRenderer from "../components/RichTextRenderer";
import { buildAskRecallPath } from "../utils/askRecall";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const DOCUMENT_TYPES = ["policy", "procedure", "guide", "report", "other"];

function formatTypeLabel(value) {
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function SnapshotTile({ label, value, palette }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: palette.text }}>{value}</p>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);
  const { success, error } = useToast();

  const [documentRecord, setDocumentRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [fileUrl, setFileUrl] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [aiResults, setAiResults] = useState(null);

  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchDocument();
    fetchComments();
  }, [id]);

  useEffect(
    () => () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    },
    [fileUrl]
  );

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load document");
      }
      const data = await res.json();
      setDocumentRecord(data);
      setFormData(data);
      setFileUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return "";
      });

      if (data.has_file) {
        try {
          const fileRes = await fetch(`${apiBase}/api/business/documents/${id}/file/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!fileRes.ok) {
            throw new Error("Failed to load attached file");
          }
          const blob = await fileRes.blob();
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        } catch (fileError) {
          error(fileError.message || "Failed to load attached file");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setDocumentRecord(null);
      error("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/business/documents/${id}/comments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load comments");
      }
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error:", err);
      error("Failed to load comments");
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/business/documents/${id}/comments/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) {
        throw new Error("Failed to add comment");
      }
      const data = await res.json();
      setComments((current) => [...current, data]);
      setNewComment("");
      success("Comment added");
    } catch (err) {
      error("Failed to add comment");
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/organizations/pdf/document/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to export PDF");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${documentRecord.title}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      success("PDF downloaded");
    } catch (err) {
      error("Failed to export PDF");
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error("Failed to update document");
      }
      setEditing(false);
      fetchDocument();
      success("Document updated successfully");
    } catch (err) {
      error("Failed to update document");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this document?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/business/documents/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to delete document");
      }
      success("Document deleted");
      navigate("/business/documents");
    } catch (err) {
      error("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--app-border-strong)", borderTopColor: "var(--app-info)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!documentRecord) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={ambientLayer} />
        <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
          <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/business/documents")} style={{ ...docSecondaryButton(palette), marginBottom: 14 }}>
            <ArrowLeftIcon style={{ width: 14, height: 14 }} /> All Documents
          </button>
          <section className="ui-card-lift ui-smooth" style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.card, padding: "40px 22px", textAlign: "center", boxShadow: "var(--ui-shadow-xs)" }}>
            <DocumentTextIcon style={{ width: 44, height: 44, color: palette.muted, margin: "0 auto 12px" }} />
            <h1 style={{ margin: 0, color: palette.text, fontSize: 24 }}>Document not found</h1>
          </section>
        </div>
      </div>
    );
  }

  const updatedAt = documentRecord.updated_at ? new Date(documentRecord.updated_at).toLocaleDateString() : "N/A";
  const createdAt = documentRecord.created_at ? new Date(documentRecord.created_at).toLocaleDateString() : "N/A";
  const typeLabel = formatTypeLabel(documentRecord.document_type || "other");
  const versionLabel = documentRecord.version || "-";
  const documentAskRecallQuestion = `Summarize the document "${documentRecord.title}" and tell me what I should pay attention to first.`;
  const heroStats = [
    { label: "Version", value: versionLabel, helper: "Current published revision." },
    { label: "Updated", value: updatedAt, helper: "Most recent recorded change." },
    { label: "Comments", value: `${comments.length}`, helper: "Discussion attached here." },
  ];
  const readingStateLabel = editing ? "Editing" : "Reading";
  const modeGuidance = editing
    ? "You are actively editing the document record. Save when the structure and wording are aligned."
    : "Read the file, review the written body, and move into comments without losing the document snapshot.";

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: 'var(--font-primary, "League Spartan"), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={ambientLayer} />
      <div style={{ ...ui.container, position: "relative", zIndex: 1, display: "grid", gap: 16 }}>
        <WorkspaceHero
          palette={palette}
          darkMode={darkMode}
          eyebrow="Document Workspace"
          title={documentRecord.title}
          description={documentRecord.description || "Keep file context, document content, and team comments in one structured page."}
          stats={heroStats}
          aside={
            <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
              <span style={heroChip(palette)}>
                <ShieldCheckIcon style={{ width: 14, height: 14 }} /> {typeLabel}
              </span>
              <span style={heroChip(palette)}>{documentRecord.has_file ? "File-backed" : "Editor-only"}</span>
            </div>
          }
          actions={
            <>
              <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/business/documents")} style={docSecondaryButton(palette)}>
                <ArrowLeftIcon style={{ width: 14, height: 14 }} />
                All Documents
              </button>
              <button onClick={handleExportPDF} className="ui-btn-polish ui-focus-ring" style={docSecondaryButton(palette)}>
                <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                Export PDF
              </button>
              <button onClick={() => navigate(buildAskRecallPath(documentAskRecallQuestion))} className="ui-btn-polish ui-focus-ring" style={docSecondaryButton(palette)}>
                <SparklesIcon style={{ width: 14, height: 14 }} />
                Ask Recall
              </button>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="ui-btn-polish ui-focus-ring" style={docPrimaryButton(palette)}>
                  <PencilIcon style={{ width: 14, height: 14 }} />
                  Edit Document
                </button>
              ) : null}
            </>
          }
        />

        <WorkspaceToolbar palette={palette}>
          <div style={detailControlDeck}>
            <section className="ui-card-lift ui-smooth" style={{ ...detailControlCard, border: `1px solid ${palette.border}`, background: palette.card }}>
              <div style={{ display: "grid", gap: 6 }}>
                <p style={{ ...sideTitle(palette), marginBottom: 0 }}>Document Control</p>
                <h2 style={detailTitle(palette)}>Move between reading, editing, export, and team commentary without losing the source record</h2>
                <p style={detailBody(palette)}>
                  The document workspace keeps file preview, written context, and discussion close together so the page feels like one record instead of several disconnected panels.
                </p>
              </div>
              <div style={detailChipRail}>
                <span style={heroChip(palette)}>Version {versionLabel}</span>
                <span style={heroChip(palette)}>{comments.length} comments</span>
                <span style={heroChip(palette)}>{readingStateLabel}</span>
              </div>
            </section>

            <section className="ui-card-lift ui-smooth" style={{ ...detailControlCard, border: `1px solid ${palette.border}`, background: palette.card }}>
              <div style={{ display: "grid", gap: 6 }}>
                <p style={{ ...sideTitle(palette), marginBottom: 0 }}>Reading State</p>
                <h2 style={detailSubTitle(palette)}>{readingStateLabel} mode</h2>
                <p style={detailBody(palette)}>{modeGuidance}</p>
              </div>
              <div style={detailMetricGrid}>
                <SnapshotTile label="Type" value={typeLabel} palette={palette} />
                <SnapshotTile label="Updated" value={updatedAt} palette={palette} />
                <SnapshotTile label="Comments" value={`${comments.length}`} palette={palette} />
                <SnapshotTile label="File" value={documentRecord.has_file ? "Attached" : "Inline"} palette={palette} />
              </div>
            </section>
          </div>
        </WorkspaceToolbar>

        <div
          className="ui-enter"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 14,
            "--ui-delay": "90ms",
          }}
        >
          <main style={{ display: "grid", gap: 14 }}>
            <section className="ui-card-lift ui-smooth" style={{ borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.card, padding: "clamp(16px,2.2vw,22px)", boxShadow: "var(--ui-shadow-xs)" }}>
              {editing ? (
                <form onSubmit={handleUpdate} style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={fieldLabel(palette)}>Title</label>
                    <input type="text" value={formData.title || ""} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={fieldLabel(palette)}>Document Type</label>
                    <select value={formData.document_type || "other"} onChange={(event) => setFormData({ ...formData, document_type: event.target.value })} style={ui.input}>
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={fieldLabel(palette)}>Description</label>
                    <textarea rows={3} value={formData.description || ""} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={{ ...ui.input, resize: "vertical" }} />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={fieldLabel(palette)}>Content</label>
                    <RichTextEditor value={formData.content || ""} onChange={(value) => setFormData({ ...formData, content: value })} placeholder="Write document content..." darkMode={darkMode} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setEditing(false)} className="ui-btn-polish ui-focus-ring" style={docSecondaryButton(palette)}>
                      Cancel
                    </button>
                    <button type="submit" className="ui-btn-polish ui-focus-ring" style={docPrimaryButton(palette)}>
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {documentRecord.description && (
                    <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 16 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Summary</p>
                      <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.7, color: palette.text }}>{documentRecord.description}</p>
                    </div>
                  )}

                  {documentRecord.has_file && fileUrl && (
                    <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Attached File</p>
                          <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: palette.text }}>{documentRecord.file_name || "Document file"}</p>
                        </div>
                        {!documentRecord.file_type?.includes("pdf") && (
                          <a href={fileUrl} download={documentRecord.file_name} style={docSecondaryButton(palette)}>
                            <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                            Download File
                          </a>
                        )}
                      </div>
                      {documentRecord.file_type?.includes("pdf") ? (
                        <iframe src={fileUrl} style={{ width: "100%", height: 560, border: `1px solid ${palette.border}`, borderRadius: 18, background: palette.card }} title="Document Preview" />
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>This file is attached to the document and ready to download.</p>
                      )}
                    </div>
                  )}

                  {!documentRecord.has_file && documentRecord.file_url && (
                    <div style={{ borderRadius: 18, border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.1)", padding: 16 }}>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--app-warning)", fontWeight: 700 }}>Legacy file storage detected</p>
                      <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--app-warning)" }}>
                        This document references older file storage. Re-upload the file to restore inline preview and current download handling.
                      </p>
                    </div>
                  )}

                  <div style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 16 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Content</p>
                    {documentRecord.content ? (
                      <div style={{ marginTop: 12 }}>
                        <RichTextRenderer content={documentRecord.content} darkMode={darkMode} />
                      </div>
                    ) : (
                      <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: palette.muted }}>No document content has been added yet.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {!editing && (
              <WorkspacePanel
                palette={palette}
                eyebrow="Team Commentary"
                title={`Comments (${comments.length})`}
                description="Conversation now sits in its own calmer panel so the document body stays readable."
              >
                <form onSubmit={handleAddComment} style={{ marginBottom: 18 }}>
                  <MentionInput value={newComment} onChange={setNewComment} placeholder="Add a comment... (Type @ to mention someone)" rows={3} darkMode={darkMode} />
                  <button type="submit" disabled={!newComment.trim()} className="ui-btn-polish ui-focus-ring" style={{ ...docPrimaryButton(palette), marginTop: 10, opacity: !newComment.trim() ? 0.65 : 1 }}>
                    Post Comment
                  </button>
                </form>

                <div style={{ display: "grid", gap: 10 }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: palette.text }}>{comment.user?.full_name || comment.user?.username || "Unknown"}</span>
                        <span style={{ fontSize: 11, color: palette.muted }}>{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted, whiteSpace: "pre-wrap" }}>{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && <p style={{ margin: 0, textAlign: "center", padding: "28px 12px", color: palette.muted, fontSize: 13 }}>No comments yet. Be the first to add context.</p>}
                </div>
              </WorkspacePanel>
            )}
          </main>

          <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <WorkspacePanel palette={palette} eyebrow="Snapshot" title="Document Snapshot" description="Key metadata stays visible without competing with the main content.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                <SnapshotTile label="Type" value={typeLabel} palette={palette} />
                <SnapshotTile label="Version" value={versionLabel} palette={palette} />
                <SnapshotTile label="Created" value={createdAt} palette={palette} />
                <SnapshotTile label="Updated" value={updatedAt} palette={palette} />
              </div>
            </WorkspacePanel>

            <section className="ui-card-lift ui-smooth" style={sideCard(palette)}>
              <h3 style={sideTitle(palette)}>Ownership</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={avatarChip(palette)}>
                    <UserCircleIcon style={{ width: 16, height: 16 }} />
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Created by</p>
                    <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 700, color: palette.text }}>{documentRecord.created_by?.full_name || "Unknown"}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={avatarChip(palette)}>
                    <UserCircleIcon style={{ width: 16, height: 16 }} />
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted }}>Last updated by</p>
                    <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 700, color: palette.text }}>{documentRecord.updated_by?.full_name || "Unknown"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="ui-card-lift ui-smooth" style={sideCard(palette)}>
              <h3 style={sideTitle(palette)}>Actions</h3>
              <div style={detailActionStack}>
                <AIEnhancementButton
                  content={documentRecord.content || documentRecord.description || ""}
                  title={documentRecord.title}
                  type="document"
                  documentId={documentRecord.id}
                  onResult={(feature, data) => setAiResults(data)}
                />
                <button onClick={() => setEditing(true)} className="ui-btn-polish ui-focus-ring" style={docSecondaryButton(palette)}>
                  <PencilIcon style={{ width: 14, height: 14 }} />
                  Edit
                </button>
                <button onClick={handleDelete} className="ui-btn-polish ui-focus-ring" style={docDangerButton(palette, darkMode)}>
                  <TrashIcon style={{ width: 14, height: 14 }} />
                  Delete
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AIResultsPanel results={aiResults} onClose={() => setAiResults(null)} />
    </div>
  );
}

const ambientLayer = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background:
    "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.12), transparent 34%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.08), transparent 28%), radial-gradient(circle at 52% 0%, rgba(99,102,241,0.06), transparent 24%)",
};

const fieldLabel = (palette) => ({
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: palette.muted,
});

const heroChip = (palette) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  border: `1px solid ${palette.border}`,
  background: palette.cardAlt,
  color: palette.text,
  fontSize: 12,
  fontWeight: 700,
});

const sideCard = (palette) => ({
  borderRadius: 24,
  border: `1px solid ${palette.border}`,
  background: palette.card,
  padding: 18,
  boxShadow: "var(--ui-shadow-xs)",
});

const sideTitle = (palette) => ({
  margin: "0 0 14px",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: palette.muted,
});

const detailControlDeck = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
  gap: 12,
};

const detailControlCard = {
  borderRadius: 22,
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "var(--ui-shadow-xs)",
};

const detailTitle = (palette) => ({
  margin: 0,
  fontSize: 24,
  lineHeight: 1.04,
  color: palette.text,
});

const detailSubTitle = (palette) => ({
  margin: 0,
  fontSize: 20,
  lineHeight: 1.08,
  color: palette.text,
});

const detailBody = (palette) => ({
  margin: 0,
  fontSize: 13,
  lineHeight: 1.65,
  color: palette.muted,
});

const detailChipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const detailMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
  gap: 10,
};

const detailActionStack = {
  display: "grid",
  gap: 10,
};

const avatarChip = (palette) => ({
  width: 36,
  height: 36,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: palette.accentSoft,
  color: palette.accent,
});

function docButtonBase(palette) {
  return {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    border: `1px solid ${palette.border}`,
  };
}

function docPrimaryButton(palette) {
  return {
    ...docButtonBase(palette),
    border: "1px solid transparent",
    background: palette.ctaGradient,
    color: palette.buttonText,
  };
}

function docSecondaryButton(palette) {
  return {
    ...docButtonBase(palette),
    background: palette.cardAlt,
    color: palette.text,
  };
}

function docDangerButton(palette, darkMode) {
  return {
    ...docButtonBase(palette),
    border: `1px solid ${darkMode ? "rgba(238,146,153,0.34)" : "rgba(200,86,93,0.24)"}`,
    background: darkMode ? "rgba(238,146,153,0.12)" : "rgba(200,86,93,0.08)",
    color: palette.danger,
  };
}
