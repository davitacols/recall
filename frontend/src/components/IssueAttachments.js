import React, { useEffect, useMemo, useState } from "react";
import { PaperClipIcon, TrashIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette } from "../utils/projectUi";

function IssueAttachments({ issueId, onCountChange }) {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAttachments();
  }, [issueId]);

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.error || err?.response?.data?.detail || err?.message || fallback;

  const fetchAttachments = async () => {
    try {
      const response = await api.get(`/api/agile/issues/${issueId}/attachments/list/`);
      const next = response.data || [];
      setAttachments(next);
      onCountChange?.(next.length);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load attachments"));
      setAttachments([]);
      onCountChange?.(0);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/api/agile/issues/${issueId}/attachments/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchAttachments();
      event.target.value = "";
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload file"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm("Delete this attachment?")) return;

    try {
      await api.delete(`/api/agile/attachments/${attachmentId}/`);
      await fetchAttachments();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete attachment"));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={stack}>
      <div style={headerRow}>
        <div>
          <p style={{ ...title, color: palette.text }}>Attachments</p>
          <p style={{ ...meta, color: palette.muted }}>{attachments.length} files linked to this issue</p>
        </div>

        <label
          className="ui-btn-polish ui-focus-ring"
          style={{
            ...uploadButton,
            color: palette.buttonText,
            background: palette.ctaGradient,
          }}
        >
          {uploading ? "Uploading..." : "Upload File"}
          <input type="file" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>

      {error ? (
        <div style={{ ...errorBanner, border: `1px solid ${palette.danger}`, color: palette.danger }}>
          {error}
        </div>
      ) : null}

      {attachments.length ? (
        <div style={stack}>
          {attachments.map((attachment) => (
            <article
              key={attachment.id}
              className="ui-card-lift ui-smooth"
              style={{ ...attachmentCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                <div style={{ ...iconWrap, background: palette.accentSoft, color: palette.accent }}>
                  <PaperClipIcon style={icon16} />
                </div>
                <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                  <a
                    href={attachment.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...fileLink, color: palette.text }}
                  >
                    {attachment.filename}
                  </a>
                  <p style={{ ...meta, color: palette.muted }}>
                    {formatFileSize(attachment.file_size)} | {attachment.uploaded_by_name || "Unknown"} |{" "}
                    {new Date(attachment.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                className="ui-btn-polish ui-focus-ring"
                onClick={() => handleDelete(attachment.id)}
                style={{
                  ...deleteButton,
                  border: `1px solid ${palette.border}`,
                  color: palette.danger,
                  background: palette.card,
                }}
              >
                <TrashIcon style={icon14} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ ...emptyState, border: `1px dashed ${palette.border}`, color: palette.muted }}>
          No attachments yet. Upload design files, screenshots, or supporting evidence here.
        </div>
      )}
    </div>
  );
}

const stack = { display: "grid", gap: 12 };
const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const title = { margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em" };
const meta = { margin: 0, fontSize: 12, lineHeight: 1.5 };
const uploadButton = { borderRadius: 999, padding: "10px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center" };
const errorBanner = { borderRadius: 14, padding: "10px 12px", fontSize: 12, background: "rgba(239, 68, 68, 0.08)" };
const attachmentCard = { borderRadius: 16, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const iconWrap = { width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 };
const fileLink = { textDecoration: "none", fontSize: 13, fontWeight: 700, lineHeight: 1.45, wordBreak: "break-word" };
const deleteButton = { width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 };
const emptyState = { borderRadius: 16, padding: "18px 14px", textAlign: "center", fontSize: 12 };
const icon14 = { width: 14, height: 14 };
const icon16 = { width: 16, height: 16 };

export default IssueAttachments;
