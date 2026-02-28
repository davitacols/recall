import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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

function CardMeta({ label, value, palette }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.08em", color: palette.muted, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: palette.text }}>{value}</p>
    </div>
  );
}

export default function Documents() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setDocuments([]);
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
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setDocuments([]);
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
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (doc.file_type?.includes("pdf")) {
          setViewerUrl(url);
          setShowViewer(true);
          return;
        }
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.file_name;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {}
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
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      setShowModal(false);
      setFormData({ title: "", description: "", document_type: "other", content: "", tags: [] });
      setUploadFile(null);
      fetchDocuments();
    } catch (error) {
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
  const statWithFiles = documents.filter((d) => d.has_file).length;
  const statPolicies = documents.filter((d) => d.document_type === "policy").length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 130, borderRadius: 12, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.75 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section
          className="ui-enter"
          style={{
            borderRadius: 18,
            border: `1px solid ${palette.border}`,
            background: `linear-gradient(140deg, ${palette.card} 8%, ${darkMode ? "#2a1d23" : "#ffefd8"} 100%)`,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: palette.muted }}>DOC HUB</p>
              <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.55rem,2.8vw,2.2rem)", color: palette.text }}>Documents</h1>
              <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Policies, procedures, and internal references in one workspace.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="ui-btn-polish" style={ui.primaryButton}>
              <PlusIcon style={{ width: 14, height: 14 }} />
              New Document
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            <CardMeta label="Visible Docs" value={statTotal} palette={palette} />
            <CardMeta label="With File" value={statWithFiles} palette={palette} />
            <CardMeta label="Policies" value={statPolicies} palette={palette} />
          </div>
        </section>

        <section
          className="ui-enter"
          style={{
            borderRadius: 14,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 10,
            marginBottom: 12,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
          }}
        >
          <div style={{ position: "relative" }}>
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
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleSearch()}
              className="ui-btn-polish"
              style={{ ...ui.primaryButton, padding: "9px 12px", minWidth: 92, justifyContent: "center", opacity: busySearch ? 0.7 : 1 }}
            >
              {busySearch ? "..." : "Search"}
            </button>
            <button
              onClick={() => {
                setQuery("");
                fetchDocuments();
              }}
              className="ui-btn-polish"
              style={{ ...ui.secondaryButton, padding: "9px 12px" }}
            >
              Reset
            </button>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <FunnelIcon style={{ width: 14, height: 14, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: palette.muted }} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...ui.input, width: 155, paddingLeft: 30 }}>
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "All Types" : type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ ...ui.input, width: 145 }}>
              <option value="recent">Sort: Recent</option>
              <option value="title">Sort: Title</option>
            </select>
          </div>
        </section>

        {viewDocuments.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "18px 12px", textAlign: "center", fontSize: 13, color: palette.muted }}>
            No documents found for current filters.
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
            {viewDocuments.map((doc) => (
              <article key={doc.id} className="ui-card-lift ui-smooth" onClick={() => handleOpenDocument(doc)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <DocumentTextIcon style={{ width: 16, height: 16, color: palette.muted, marginTop: 2 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 15, color: palette.text }}>{doc.title || "Untitled document"}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.5 }}>{doc.description || "No description provided."}</p>
                    {doc.file_name && <p style={{ margin: "6px 0 0", fontSize: 11, color: palette.muted }}>{doc.file_name}</p>}
                  </div>
                </div>
                <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.muted, textTransform: "capitalize", border: `1px solid ${palette.border}`, borderRadius: 999, padding: "3px 8px" }}>
                    {doc.document_type || "other"}
                  </span>
                  <span style={{ fontSize: 11, color: palette.muted }}>{toDocDate(doc)}</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <button onClick={(event) => { event.stopPropagation(); navigate(`/business/documents/${doc.id}`); }} className="ui-btn-polish" style={{ ...ui.secondaryButton, padding: "7px 10px", fontSize: 12 }}>
                    Edit
                  </button>
                  <span style={{ fontSize: 12, color: darkMode ? "#93c5fd" : "#1d4ed8", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Open
                    <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}

        {showViewer && (
          <div style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(0,0,0,0.9)", display: "grid", placeItems: "center" }} onClick={() => setShowViewer(false)}>
            <div style={{ width: "100%", height: "100%", padding: 12 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button onClick={() => setShowViewer(false)} style={{ ...ui.secondaryButton, borderColor: "rgba(255,255,255,0.5)", color: "#fff" }}>
                  Close
                </button>
              </div>
              <iframe src={viewerUrl} title="Document preview" style={{ width: "100%", height: "calc(100vh - 72px)", border: "none", borderRadius: 8, background: "#fff" }} />
            </div>
          </div>
        )}

        {showModal &&
          createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.64)", display: "grid", placeItems: "center", padding: 14 }} onClick={() => setShowModal(false)}>
            <div style={{ width: "min(860px,100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 14 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, color: palette.text, fontSize: 20 }}>Create Document</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>Use file upload, rich content, or both.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="ui-btn-polish" style={{ ...ui.secondaryButton, padding: "8px 10px" }}>
                  <XMarkIcon style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Document title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="ui-focus-ring" style={ui.input} />
                <div style={ui.twoCol}>
                  <select value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} style={ui.input}>
                    <option value="policy">Policy</option>
                    <option value="procedure">Procedure</option>
                    <option value="guide">Guide</option>
                    <option value="report">Report</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={ui.input} />
                </div>
                <textarea rows={3} placeholder="Short description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={ui.input} />
                <div>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: palette.muted, fontWeight: 700 }}>Document Content</p>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder="Write your document content..."
                    darkMode={darkMode}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                  <button type="button" onClick={() => setShowModal(false)} className="ui-btn-polish" style={ui.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" className="ui-btn-polish" style={{ ...ui.primaryButton, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
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
