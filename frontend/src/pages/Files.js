import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  DocumentIcon,
  FolderIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import api from "../services/api";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

function normalizeDocuments(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function toDisplayDate(value) {
  if (!value) return "Recently uploaded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently uploaded";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Files() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/conversations/documents/all/");
        setDocuments(normalizeDocuments(response?.data));
      } catch (requestError) {
        console.error("Failed to fetch files:", requestError);
        setError("We could not load the shared file index right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const totalBytes = documents.reduce((sum, doc) => sum + Number(doc?.file_size || 0), 0);
  const filesWithComments = documents.filter((doc) => Boolean(doc?.comment)).length;
  const newestFile = documents[0]?.created_at || null;

  const stats = [
    {
      label: "Files",
      value: documents.length,
      helper: "Conversation attachments indexed across the workspace",
      tone: palette.info,
    },
    {
      label: "Stored",
      value: formatFileSize(totalBytes),
      helper: "Combined file size for the current file list",
      tone: palette.accent,
    },
    {
      label: "Annotated",
      value: filesWithComments,
      helper: newestFile ? `Latest upload ${toDisplayDate(newestFile)}` : "Comments help preserve upload context",
      tone: palette.success,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Shared Assets"
        title="Files"
        description="Browse uploaded files with the conversation context that explains why they matter, who shared them, and when they entered the project memory."
        stats={stats}
        aside={
          <div
            style={{
              minWidth: 220,
              borderRadius: 20,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: palette.muted }}>
              Index Scope
            </p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.text }}>
              This view surfaces conversation attachments so teams can re-open source files without retracing the thread that introduced them.
            </p>
          </div>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 14,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              color: palette.muted,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <FolderIcon style={{ width: 16, height: 16 }} />
            Uploaded files appear here automatically
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 14,
              border: `1px solid ${palette.border}`,
              background: palette.cardAlt,
              color: palette.muted,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <ChatBubbleLeftRightIcon style={{ width: 16, height: 16 }} />
            Keep comments on uploads so future teams know what changed
          </div>
        </div>
      </WorkspaceToolbar>

      <WorkspacePanel
        palette={palette}
        eyebrow="Library"
        title={documents.length ? `${documents.length} indexed files` : "Shared file library"}
        description="Every card keeps the attachment, comment, uploader, and timestamp together so a download still has context."
      >
        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  minHeight: 124,
                  borderRadius: 18,
                  border: `1px solid ${palette.border}`,
                  background: palette.cardAlt,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <WorkspaceEmptyState
            palette={palette}
            title="The file index is unavailable"
            description={error}
          />
        ) : null}

        {!loading && !error && documents.length === 0 ? (
          <WorkspaceEmptyState
            palette={palette}
            title="No files yet"
            description="Files attached to conversations will collect here automatically once the team starts sharing assets."
          />
        ) : null}

        {!loading && !error && documents.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {documents.map((doc) => (
              <article
                key={doc.id}
                className="ui-card-lift ui-smooth"
                style={{
                  border: `1px solid ${palette.border}`,
                  borderRadius: 20,
                  padding: 16,
                  background: palette.cardAlt,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: palette.accentSoft,
                        color: palette.info,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DocumentIcon style={{ width: 20, height: 20 }} />
                    </div>
                    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: palette.text,
                          fontSize: 17,
                          fontWeight: 800,
                          letterSpacing: "-0.03em",
                          textDecoration: "none",
                          wordBreak: "break-word",
                        }}
                      >
                        {doc.filename || "Untitled file"}
                      </a>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: palette.muted }}>
                        {doc.comment || "No upload note was captured for this file."}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        ...ui.secondaryButton,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <LinkIcon style={{ width: 15, height: 15 }} />
                      Open
                    </a>
                    <a
                      href={doc.file_url}
                      download
                      className="ui-btn-polish ui-focus-ring"
                      style={{
                        ...ui.primaryButton,
                        textDecoration: "none",
                      }}
                    >
                      <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
                      Download
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    `Size ${formatFileSize(doc.file_size)}`,
                    `Uploaded by ${doc.uploaded_by || "Unknown"}`,
                    toDisplayDate(doc.created_at),
                  ].map((label) => (
                    <span
                      key={label}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `1px solid ${palette.border}`,
                        background: palette.card,
                        color: palette.muted,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </WorkspacePanel>
    </div>
  );
}
