import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
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

function SummaryCard({ icon: Icon, label, value, helper, palette, tone }) {
  return (
    <article
      style={{
        borderRadius: 22,
        padding: "16px 16px 14px",
        border: `1px solid ${tone?.border || palette.border}`,
        background: tone?.bg || palette.cardAlt,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: tone?.iconBg || palette.accentSoft,
            color: tone?.iconColor || palette.accent,
          }}
        >
          <Icon style={{ width: 16, height: 16 }} />
        </span>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", color: palette.muted, textTransform: "uppercase", fontWeight: 700 }}>{label}</p>
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: tone?.text || palette.text, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>{helper}</p>
    </article>
  );
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
      } catch (err) {
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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            background: darkMode
              ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.1), transparent 28%)"
              : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.1), transparent 34%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.08), transparent 28%)",
          }}
        />
        <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 22, height: 160, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.72, boxShadow: "var(--ui-shadow-xs)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: darkMode
            ? "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.1), transparent 28%), radial-gradient(circle at 56% 0%, rgba(99,102,241,0.08), transparent 26%)"
            : "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.1), transparent 34%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.08), transparent 28%), radial-gradient(circle at 56% 0%, rgba(99,102,241,0.06), transparent 26%)",
        }}
      />
      <div style={{ ...ui.container, position: "relative", zIndex: 1 }}>
        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            borderRadius: 28,
            border: `1px solid ${palette.border}`,
            background: darkMode
              ? "linear-gradient(145deg, rgba(11,18,32,0.96) 0%, rgba(17,24,39,0.94) 56%, rgba(21,32,54,0.9) 100%)"
              : "linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(246,249,252,0.98) 58%, rgba(232,241,255,0.92) 100%)",
            padding: "clamp(20px,3vw,30px)",
            marginBottom: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 18,
            boxShadow: "var(--ui-shadow-sm)",
          }}
        >
          <div style={{ display: "grid", alignContent: "space-between", gap: 16, minWidth: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: palette.muted, textTransform: "uppercase" }}>DOCUMENT WORKSPACE</p>
              <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem,3vw,2.7rem)", letterSpacing: "-0.04em", lineHeight: 1.02, color: palette.text }}>Documents</h1>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: palette.muted, maxWidth: 720 }}>
                Policies, procedures, and internal references stay readable, searchable, and tied to the work they support.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, fontSize: 12, fontWeight: 700 }}>
                <ShieldCheckIcon style={{ width: 14, height: 14 }} /> {statPolicies} policies documented
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, fontSize: 12, fontWeight: 700 }}>
                <MagnifyingGlassIcon style={{ width: 14, height: 14 }} /> Search title, description, and content
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setShowModal(true)} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                <PlusIcon style={{ width: 14, height: 14 }} />
                New Document
              </button>
              <button onClick={fetchDocuments} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                Refresh Library
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <SummaryCard icon={ChartBarIcon} label="Visible Docs" value={statTotal} helper="Knowledge assets available to the team right now." palette={palette} />
            <SummaryCard icon={DocumentTextIcon} label="File-backed" value={statWithFiles} helper="Records with attached files ready for quick open or download." palette={palette} />
            <SummaryCard icon={ClockIcon} label="Updated 30d" value={statRecentlyUpdated} helper="Documents refreshed recently to keep operational memory current." palette={palette} />
          </div>
        </section>

        <section
          className="ui-enter ui-card-lift ui-smooth"
          style={{
            borderRadius: 24,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 18,
            marginBottom: 16,
            display: "grid",
            gap: 14,
            boxShadow: "var(--ui-shadow-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>FIND CONTEXT FAST</p>
              <h2 style={{ margin: "8px 0 4px", fontSize: 20, color: palette.text }}>Search, sort, and triage the library</h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.muted }}>Use keywords and document type filters to move from scattered files to the right source quickly.</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, fontSize: 12, fontWeight: 700 }}>
                Showing {viewDocuments.length}
              </span>
              {query.trim() && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text, fontSize: 12, fontWeight: 700 }}>
                  Query: "{query.trim()}"
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 360px", minWidth: 0 }}>
                <MagnifyingGlassIcon style={{ width: 16, height: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
                <input
                  className="ui-focus-ring"
                  type="text"
                  placeholder="Search by title, description, or document content..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                  style={{ ...ui.input, paddingLeft: 35 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <FunnelIcon style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ ...ui.input, width: 180, paddingLeft: 30 }}>
                  {DOC_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type === "all" ? "All Types" : formatTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} style={{ ...ui.input, width: 160 }}>
                <option value="recent">Sort: Recent</option>
                <option value="title">Sort: Title</option>
              </select>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "8px 12px", border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.muted, fontSize: 12, fontWeight: 700 }}>
                <ShieldCheckIcon style={{ width: 14, height: 14 }} /> {statPolicies} policy records
              </span>
            </div>
          </div>
        </section>

        {viewDocuments.length === 0 ? (
          <div
            className="ui-enter ui-card-lift ui-smooth"
            style={{
              borderRadius: 24,
              border: `1px dashed ${palette.border}`,
              background: palette.card,
              padding: "52px 22px",
              textAlign: "center",
              color: palette.muted,
              display: "grid",
              justifyItems: "center",
              gap: 10,
              boxShadow: "var(--ui-shadow-xs)",
            }}
          >
            <DocumentTextIcon style={{ width: 48, height: 48, color: palette.muted }} />
            <h2 style={{ margin: "6px 0 0", fontSize: 24, color: palette.text }}>
              {hasAnyDocuments ? "No documents match these filters" : "Build the team library"}
            </h2>
            <p style={{ margin: 0, maxWidth: 540, fontSize: 14, lineHeight: 1.6 }}>
              {hasAnyDocuments
                ? "Try resetting the search or changing the type filter to widen the library view."
                : "Upload a policy, capture a runbook, or start a working draft so your team can retrieve context faster."}
            </p>
            <button onClick={hasAnyDocuments ? handleResetFilters : () => setShowModal(true)} className="ui-btn-polish ui-focus-ring" style={{ ...ui.primaryButton, marginTop: 8 }}>
              {hasAnyDocuments ? "Reset Filters" : "Create First Document"}
            </button>
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
            {viewDocuments.map((doc) => (
              <article
                key={doc.id}
                className="ui-card-lift ui-smooth"
                onClick={() => handleOpenDocument(doc)}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${palette.border}`,
                  background: palette.card,
                  padding: 18,
                  cursor: "pointer",
                  display: "grid",
                  gap: 14,
                  minHeight: 228,
                  boxShadow: "var(--ui-shadow-xs)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, minWidth: 0 }}>
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background: palette.accentSoft,
                        color: palette.accent,
                      }}
                    >
                      <DocumentTextIcon style={{ width: 18, height: 18 }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: palette.muted }}>
                        Knowledge Asset
                      </p>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: palette.text, lineHeight: 1.15 }}>{doc.title || "Untitled document"}</h3>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{doc.description || "No description provided."}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.text, textTransform: "capitalize", border: `1px solid ${palette.border}`, borderRadius: 999, padding: "6px 10px", background: palette.cardAlt }}>
                    {formatTypeLabel(doc.document_type)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "6px 10px", background: palette.cardAlt }}>
                    {doc.has_file ? "File-backed" : "Editor-only"}
                  </span>
                  {doc.file_name && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: palette.muted, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "6px 10px", background: palette.cardAlt }}>
                      {doc.file_name}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, paddingTop: 12, borderTop: `1px solid ${palette.border}`, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>Updated</p>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.text, fontWeight: 700 }}>{toDocDate(doc) || "Unknown"}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/business/documents/${doc.id}`);
                      }}
                      className="ui-btn-polish ui-focus-ring"
                      style={{ ...ui.secondaryButton, fontSize: 12 }}
                    >
                      Edit
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: palette.accent, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {doc.has_file ? "Open file" : "Open document"}
                      {doc.has_file ? <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} /> : <ArrowRightIcon style={{ width: 12, height: 12 }} />}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {showViewer && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(4,10,18,0.78)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 18 }}
            onClick={closeViewer}
          >
            <div
              style={{ width: "min(1180px,100%)", height: "min(92vh,100%)", borderRadius: 28, border: `1px solid ${palette.border}`, background: palette.card, boxShadow: "var(--ui-shadow-lg)", padding: 14, display: "grid", gridTemplateRows: "auto 1fr" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: palette.muted, fontWeight: 700 }}>Preview</p>
                  <p style={{ margin: "6px 0 0", fontSize: 15, color: palette.text, fontWeight: 700 }}>Document file viewer</p>
                </div>
                <button className="ui-btn-polish ui-focus-ring" onClick={closeViewer} style={{ ...ui.secondaryButton, borderColor: palette.border, color: palette.text, background: palette.cardAlt }}>
                  Close
                </button>
              </div>
              <iframe src={viewerUrl} title="Document preview" style={{ width: "100%", height: "100%", border: "none", borderRadius: 18, background: palette.cardAlt }} />
            </div>
          </div>
        )}

        {showModal &&
          createPortal(
            <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(6,12,22,0.72)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 16 }} onClick={() => setShowModal(false)}>
              <div style={{ width: "min(900px,100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: 28, border: `1px solid ${palette.border}`, background: palette.card, padding: 22, boxShadow: "var(--ui-shadow-lg)" }} onClick={(event) => event.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: palette.muted, textTransform: "uppercase" }}>Create Knowledge Asset</p>
                    <h2 style={{ margin: "8px 0 0", color: palette.text, fontSize: 24, letterSpacing: "-0.02em" }}>Create Document</h2>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: palette.muted }}>Use file upload, rich content, or both.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="ui-btn-polish ui-focus-ring" style={{ ...ui.secondaryButton, padding: "8px 10px" }}>
                    <XMarkIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  <input required placeholder="Document title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} className="ui-focus-ring" style={ui.input} />
                  <div style={ui.twoCol}>
                    <select value={formData.document_type} onChange={(event) => setFormData({ ...formData, document_type: event.target.value })} style={ui.input}>
                      <option value="policy">Policy</option>
                      <option value="procedure">Procedure</option>
                      <option value="guide">Guide</option>
                      <option value="report">Report</option>
                      <option value="other">Other</option>
                    </select>
                    <input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} style={ui.input} />
                  </div>
                  <textarea rows={3} placeholder="Short description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: palette.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Document Content</p>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      placeholder="Write your document content..."
                      darkMode={darkMode}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
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
          )}
      </div>
    </div>
  );
}
