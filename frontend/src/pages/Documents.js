import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useToast } from "../components/Toast";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import { buildAskRecallPath } from "../utils/askRecall";
import RichTextEditor from "../components/RichTextEditor";

const DOC_TYPES = ["all", "policy", "procedure", "guide", "report", "other"];

function toDocDate(doc) {
  const value = doc.updated_at || doc.created_at;
  if (!value) return "";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString();
}

function formatTypeLabel(value) {
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function Documents() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busySearch, setBusySearch] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    document_type: "other",
    content: "",
    tags: [],
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const closeViewer = () => {
    if (viewerUrl) {
      URL.revokeObjectURL(viewerUrl);
    }
    setViewerUrl("");
    setShowViewer(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(
    () => () => {
      if (viewerUrl) {
        URL.revokeObjectURL(viewerUrl);
      }
    },
    [viewerUrl]
  );

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setDocuments([]);
      error(err.message || "Couldn't load documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (forcedQuery = query) => {
    const trimmed = (forcedQuery || "").trim();
    if (!trimmed) {
      fetchDocuments();
      return;
    }
    setBusySearch(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/search/?q=${encodeURIComponent(trimmed)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Search failed");
      }
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setDocuments([]);
      error(err.message || "Couldn't search documents right now.");
    } finally {
      setBusySearch(false);
    }
  };

  const handleOpenDocument = async (doc) => {
    if (doc.has_file) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/${doc.id}/file/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error("Failed to open file");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (doc.file_type?.includes("pdf")) {
          if (viewerUrl) {
            URL.revokeObjectURL(viewerUrl);
          }
          setViewerUrl(url);
          setShowViewer(true);
          return;
        }
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = doc.file_name;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (_) {
        error("Couldn't open the document file.");
      }
      return;
    }
    navigate(`/business/documents/${doc.id}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("description", formData.description);
      payload.append("document_type", formData.document_type);
      payload.append("content", formData.content);
      if (uploadFile) payload.append("file", uploadFile);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create document");
      }
      setShowModal(false);
      setFormData({ title: "", description: "", document_type: "other", content: "", tags: [] });
      setUploadFile(null);
      await fetchDocuments();
      success("Document created");
    } catch (err) {
      error(err.message || "Couldn't create document.");
    } finally {
      setSubmitting(false);
    }
  };

  const viewDocuments = useMemo(() => {
    const filtered = documents.filter((doc) => typeFilter === "all" || doc.document_type === typeFilter);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortMode === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
    return sorted;
  }, [documents, typeFilter, sortMode]);

  const statTotal = documents.length;
  const statWithFiles = documents.filter((doc) => doc.has_file).length;
  const statPolicies = documents.filter((doc) => doc.document_type === "policy").length;
  const statRecentlyUpdated = documents.filter((doc) => {
    const raw = doc.updated_at || doc.created_at;
    if (!raw) return false;
    const timestamp = new Date(raw).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 30;
  }).length;
  const hasAnyDocuments = documents.length > 0;

  const handleResetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setSortMode("recent");
    fetchDocuments();
  };

  const heroStats = [
    {
      label: "Library",
      value: statTotal,
      helper: "Visible knowledge assets",
      tone: palette.accent,
    },
    {
      label: "File-backed",
      value: statWithFiles,
      helper: "Records with attached source files",
      tone: palette.text,
    },
    {
      label: "Policies",
      value: statPolicies,
      helper: "Policy records in the library",
      tone: palette.warn,
    },
    {
      label: "Updated 30d",
      value: statRecentlyUpdated,
      helper: "Recently refreshed documents",
      tone: palette.success,
    },
  ];

  const libraryAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(160deg, rgba(32,27,23,0.9), rgba(22,18,15,0.82))"
          : "linear-gradient(160deg, rgba(255,252,248,0.96), rgba(244,237,226,0.88))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Library Health</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>Keep the source record close to the work.</h3>
      <p style={{ ...asideBody, color: palette.muted }}>
        Policies, procedures, reports, and guides should be easy to open, easy to search, and easy to trust.
      </p>
      <div style={asideMetricRail}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Policies</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{statPolicies}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Recent</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{statRecentlyUpdated}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: 24,
                height: 150,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.76,
                boxShadow: "var(--ui-shadow-sm)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
          {[1, 2, 3].map((item) => (
            <div
              key={`card-${item}`}
              style={{
                borderRadius: 24,
                minHeight: 240,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.72,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Memory"
        title="Documents"
        description="Policies, procedures, guides, and reports stay readable, searchable, and connected to the work they support."
        stats={heroStats}
        aside={libraryAside}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => setShowModal(true)} style={ui.primaryButton}>
              <PlusIcon style={icon14} /> New Document
            </button>
            <button
              className="ui-btn-polish ui-focus-ring"
              onClick={() => navigate(buildAskRecallPath("Which recent documents should I review first, and what changed most recently?"))}
              style={ui.secondaryButton}
            >
              <SparklesIcon style={icon14} /> Ask Recall
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchDocuments} style={ui.secondaryButton}>
              Refresh Library
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Library Controls</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Search, sort, and triage the document library</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Use keywords and type filters to move from a broad library view to the exact source record you need.
            </p>
          </div>

          <div style={toolbarMetaRail}>
            <span style={{ ...toolbarMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              Showing {viewDocuments.length}
            </span>
            {query.trim() ? (
              <span style={{ ...toolbarMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                Query "{query.trim()}"
              </span>
            ) : null}
          </div>

          <div style={searchRail}>
            <div style={{ position: "relative", flex: "1 1 360px", minWidth: 0 }}>
              <MagnifyingGlassIcon style={{ ...searchIcon, color: palette.muted }} />
              <input
                className="ui-focus-ring"
                type="text"
                placeholder="Search title, description, or document content..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                style={{ ...ui.input, paddingLeft: 38 }}
              />
            </div>

            <button
              onClick={() => handleSearch()}
              className="ui-btn-polish ui-focus-ring"
              style={{ ...ui.primaryButton, minWidth: 116, justifyContent: "center", opacity: busySearch ? 0.7 : 1 }}
              disabled={busySearch}
            >
              {busySearch ? "Searching..." : "Search"}
            </button>

            <button onClick={handleResetFilters} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
              Reset
            </button>
          </div>

          <div style={filterRail}>
            <div style={{ position: "relative" }}>
              <FunnelIcon style={{ ...filterIcon, color: palette.muted }} />
              <select className="ui-focus-ring" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ ...ui.input, width: 190, paddingLeft: 34 }}>
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Types" : formatTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            <select className="ui-focus-ring" value={sortMode} onChange={(event) => setSortMode(event.target.value)} style={{ ...ui.input, width: 170 }}>
              <option value="recent">Recent first</option>
              <option value="title">Title</option>
            </select>

            <span style={{ ...toolbarMetaChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
              <ShieldCheckIcon style={icon14} /> {statPolicies} policy records
            </span>
          </div>
        </div>
      </WorkspaceToolbar>

      {viewDocuments.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          title={hasAnyDocuments ? "No documents match these filters" : "Build the team library"}
          description={
            hasAnyDocuments
              ? "Try resetting the search or changing the type filter to widen the library view."
              : "Upload a policy, capture a runbook, or start a working draft so your team can retrieve context faster."
          }
          action={
            <button
              onClick={hasAnyDocuments ? handleResetFilters : () => setShowModal(true)}
              className="ui-btn-polish ui-focus-ring"
              style={ui.primaryButton}
            >
              {hasAnyDocuments ? "Reset Filters" : "Create First Document"}
            </button>
          }
        />
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 14 }}>
          {viewDocuments.map((doc) => {
            const excerpt = stripHtml(doc.description || doc.content || "");
            return (
              <article
                key={doc.id}
                className="ui-card-lift ui-smooth"
                onClick={() => handleOpenDocument(doc)}
                style={{
                  ...documentCard,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                }}
              >
                <div style={documentCardTop}>
                  <span
                    style={{
                      ...documentIcon,
                      background: palette.accentSoft,
                      color: palette.accent,
                    }}
                  >
                    <DocumentTextIcon style={{ width: 18, height: 18 }} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...cardEyebrow, color: palette.muted }}>Knowledge Asset</p>
                    <h3 style={{ ...cardTitle, color: palette.text }}>{doc.title || "Untitled document"}</h3>
                  </div>
                  <span style={{ ...typeChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {formatTypeLabel(doc.document_type)}
                  </span>
                </div>

                <p style={{ ...cardDescription, color: palette.muted }}>
                  {excerpt || "No summary yet. Open the document to add context, source material, or internal guidance."}
                </p>

                <div style={chipRail}>
                  <span style={{ ...miniChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                    {doc.has_file ? "File-backed" : "Editor-only"}
                  </span>
                  {doc.file_name ? (
                    <span style={{ ...miniChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.muted }}>
                      {doc.file_name}
                    </span>
                  ) : null}
                </div>

                <div style={{ ...documentFooter, borderTop: `1px solid ${palette.border}` }}>
                  <div>
                    <p style={{ ...footerLabel, color: palette.muted }}>Updated</p>
                    <p style={{ ...footerValue, color: palette.text }}>{toDocDate(doc) || "Unknown"}</p>
                  </div>

                  <div style={documentActionRail}>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/business/documents/${doc.id}`);
                      }}
                      className="ui-btn-polish ui-focus-ring"
                      style={miniActionButton(palette)}
                    >
                      Edit
                    </button>
                    <span style={{ ...openLink, color: palette.accent }}>
                      {doc.has_file ? "Open file" : "Open document"}
                      {doc.has_file ? <ArrowTopRightOnSquareIcon style={icon12} /> : <ArrowRightIcon style={icon12} />}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showViewer ? (
        <div
          style={viewerOverlay}
          onClick={closeViewer}
        >
          <div
            style={{ ...viewerCard, border: `1px solid ${palette.border}`, background: palette.card }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={viewerHeader}>
              <div>
                <p style={{ ...viewerEyebrow, color: palette.muted }}>Preview</p>
                <p style={{ ...viewerTitle, color: palette.text }}>Document file viewer</p>
              </div>
              <button className="ui-btn-polish ui-focus-ring" onClick={closeViewer} style={{ ...ui.secondaryButton, background: palette.cardAlt }}>
                Close
              </button>
            </div>
            <iframe src={viewerUrl} title="Document preview" style={{ width: "100%", height: "100%", border: "none", borderRadius: 20, background: palette.cardAlt }} />
          </div>
        </div>
      ) : null}

      {showModal
        ? createPortal(
            <div style={modalOverlay} onClick={() => setShowModal(false)}>
              <div
                style={{ ...modalCard, border: `1px solid ${palette.border}`, background: palette.card }}
                onClick={(event) => event.stopPropagation()}
              >
                <div style={modalHeader}>
                  <div>
                    <p style={{ ...modalEyebrow, color: palette.muted }}>Create Knowledge Asset</p>
                    <h2 style={{ ...modalTitle, color: palette.text }}>Create Document</h2>
                    <p style={{ ...modalBody, color: palette.muted }}>
                      Add a rich-text note, attach a source file, or combine both so teams can recover the record behind their work.
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, padding: "8px 10px" }}>
                    <XMarkIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={formStack}>
                  <input
                    required
                    placeholder="Document title"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    className="ui-focus-ring"
                    style={ui.input}
                  />

                  <div style={ui.twoCol}>
                    <select
                      value={formData.document_type}
                      onChange={(event) => setFormData({ ...formData, document_type: event.target.value })}
                      className="ui-focus-ring"
                      style={ui.input}
                    >
                      <option value="policy">Policy</option>
                      <option value="procedure">Procedure</option>
                      <option value="guide">Guide</option>
                      <option value="report">Report</option>
                      <option value="other">Other</option>
                    </select>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                      className="ui-focus-ring"
                      style={ui.input}
                    />
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Short description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="ui-focus-ring"
                    style={{ ...ui.input, resize: "vertical" }}
                  />

                  <div>
                    <p style={{ ...editorLabel, color: palette.muted }}>Document Content</p>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Write your document content..."
                      darkMode={darkMode}
                    />
                  </div>

                  <div style={buttonRow}>
                    <button type="button" onClick={() => setShowModal(false)} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                      Cancel
                    </button>
                    <button type="submit" className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                      {submitting ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function miniActionButton(palette) {
  return {
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    background: palette.cardAlt,
    color: palette.text,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const toolbarLayout = {
  display: "grid",
  gap: 14,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.02,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  maxWidth: 760,
};

const toolbarMetaRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toolbarMetaChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const searchRail = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const searchIcon = {
  width: 16,
  height: 16,
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
};

const filterRail = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const filterIcon = {
  width: 14,
  height: 14,
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
};

const asideCard = {
  minWidth: 240,
  borderRadius: 24,
  padding: 16,
  display: "grid",
  gap: 10,
};

const asideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.04,
};

const asideBody = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
};

const asideMetricRail = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const asideMetric = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 3,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const documentCard = {
  borderRadius: 26,
  padding: 20,
  cursor: "pointer",
  display: "grid",
  gap: 14,
  minHeight: 278,
  boxShadow: "var(--ui-shadow-sm)",
};

const documentCardTop = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 12,
  alignItems: "start",
};

const documentIcon = {
  width: 48,
  height: 48,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const cardEyebrow = {
  margin: "0 0 6px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.05,
};

const typeChip = {
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const cardDescription = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.68,
  minHeight: 72,
};

const chipRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const miniChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
};

const documentFooter = {
  marginTop: "auto",
  paddingTop: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-end",
  flexWrap: "wrap",
};

const footerLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const footerValue = {
  margin: "6px 0 0",
  fontSize: 14,
  fontWeight: 700,
};

const documentActionRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const openLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 700,
};

const viewerOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 140,
  background: "rgba(14, 10, 8, 0.42)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  padding: 18,
};

const viewerCard = {
  width: "min(1180px,100%)",
  height: "min(92vh,100%)",
  borderRadius: 28,
  boxShadow: "var(--ui-shadow-lg)",
  padding: 14,
  display: "grid",
  gridTemplateRows: "auto 1fr",
};

const viewerHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  marginBottom: 10,
};

const viewerEyebrow = {
  margin: 0,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
};

const viewerTitle = {
  margin: "6px 0 0",
  fontSize: 15,
  fontWeight: 700,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 150,
  background: "rgba(14, 10, 8, 0.42)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const modalCard = {
  width: "min(900px,100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  borderRadius: 28,
  padding: 22,
  boxShadow: "var(--ui-shadow-lg)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const modalEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const modalTitle = {
  margin: "8px 0 0",
  fontSize: 28,
  lineHeight: 1.02,
};

const modalBody = {
  margin: "8px 0 0",
  fontSize: 13,
  lineHeight: 1.6,
};

const formStack = {
  marginTop: 16,
  display: "grid",
  gap: 12,
};

const editorLabel = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const buttonRow = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 6,
  flexWrap: "wrap",
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };
