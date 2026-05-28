import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const DOC_TYPES = [
  { id: "all", label: "All" },
  { id: "policy", label: "Policies" },
  { id: "procedure", label: "Procedures" },
  { id: "guide", label: "Guides" },
  { id: "report", label: "Reports" },
  { id: "other", label: "Other" },
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function Documents() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busySearch, setBusySearch] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    document_type: "other",
    content: "",
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState("");
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    fetchDocuments();
    return () => {
      if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apiBase = process.env.REACT_APP_API_URL || "";
  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/business/documents/`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load documents");
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : payload?.results || []);
    } catch (err) {
      setDocuments([]);
      error?.(err.message || "Couldn't load documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (raw = query) => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return fetchDocuments();
    setBusySearch(true);
    try {
      const res = await fetch(
        `${apiBase}/api/business/documents/search/?q=${encodeURIComponent(trimmed)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Search failed");
      const payload = await res.json();
      setDocuments(Array.isArray(payload) ? payload : payload?.results || []);
    } catch (err) {
      setDocuments([]);
      error?.(err.message || "Couldn't search documents right now.");
    } finally {
      setBusySearch(false);
    }
  };

  const handleOpen = async (doc) => {
    if (doc.has_file) {
      try {
        const res = await fetch(`${apiBase}/api/business/documents/${doc.id}/file/`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to open file");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (doc.file_type?.includes("pdf")) {
          if (viewerUrl) URL.revokeObjectURL(viewerUrl);
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
        error?.("Couldn't open the document file.");
      }
      return;
    }
    navigate(`/business/documents/${doc.id}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("description", formData.description);
      payload.append("document_type", formData.document_type);
      payload.append("content", formData.content);
      if (uploadFile) payload.append("file", uploadFile);
      const res = await fetch(`${apiBase}/api/business/documents/`, {
        method: "POST",
        headers: authHeaders(),
        body: payload,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create document");
      }
      setShowModal(false);
      setFormData({ title: "", description: "", document_type: "other", content: "" });
      setUploadFile(null);
      await fetchDocuments();
      success?.("Page created");
    } catch (err) {
      error?.(err.message || "Couldn't create document.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleDocs = useMemo(() => {
    const filtered = documents.filter((d) => typeFilter === "all" || d.document_type === typeFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      const ad = a.updated_at || a.created_at || 0;
      const bd = b.updated_at || b.created_at || 0;
      return new Date(bd) - new Date(ad);
    });
    return sorted;
  }, [documents, typeFilter, sortMode]);

  const typeTabs = DOC_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? documents.length : documents.filter((d) => d.document_type === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[
          { label: "Knoledgr", to: "/" },
          { label: "Documents" },
        ]}
        title="Pages"
        subtitle="Working documents, guides, and policies for this workspace."
        actions={
          <>
            <Button appearance="subtle" onClick={() => navigate("/business/templates")}>
              Templates
            </Button>
            <Button
              appearance="primary"
              iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
              onClick={() => setShowModal(true)}
            >
              Create page
            </Button>
          </>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={typeTabs} value={typeFilter} onChange={setTypeFilter} />
      </div>

      <div style={toolbar}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <MagnifyingGlassIcon style={searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(query);
            }}
            placeholder="Search pages…"
            className="atlas-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Button appearance="subtle" onClick={() => handleSearch(query)} isDisabled={busySearch}>
          {busySearch ? "Searching…" : "Search"}
        </Button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Sort:</span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="atlas-input"
          style={{ width: 160 }}
        >
          <option value="recent">Recently updated</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : visibleDocs.length === 0 ? (
        <EmptyState
          icon={<DocumentTextIcon style={{ width: "100%", height: "100%" }} />}
          title="No pages yet"
          description="Create a page to capture team knowledge, or upload a file your team can find later."
          primaryAction={
            <Button appearance="primary" onClick={() => setShowModal(true)}>
              Create page
            </Button>
          }
        />
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={{ ...th, width: "50%" }}>Title</th>
                <th style={th}>Type</th>
                <th style={th}>Owner</th>
                <th style={th}>Updated</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocs.map((doc) => (
                <tr key={doc.id} style={tableRow}>
                  <td style={td}>
                    <button type="button" onClick={() => handleOpen(doc)} style={titleButton}>
                      <DocumentTextIcon style={{ width: 16, height: 16, color: "var(--b400)", flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={titleText}>{doc.title || "Untitled"}</span>
                        {doc.description ? (
                          <span style={excerptText}>{stripHtml(doc.description).slice(0, 140)}</span>
                        ) : null}
                      </span>
                    </button>
                  </td>
                  <td style={td}>
                    <Lozenge>{doc.document_type || "other"}</Lozenge>
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Avatar size="sm" name={doc.created_by_name || doc.owner || "—"} />
                      <span style={{ fontSize: 13, color: "var(--app-text)" }}>
                        {doc.created_by_name || doc.owner || "—"}
                      </span>
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatDate(doc.updated_at || doc.created_at)}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button appearance="subtle" size="sm" onClick={() => handleOpen(doc)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <Modal onClose={() => setShowModal(false)} title="Create page">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="atlas-input"
                required
                autoFocus
              />
            </Field>
            <Field label="Description">
              <input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="atlas-input"
              />
            </Field>
            <Field label="Type">
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="atlas-input"
              >
                {DOC_TYPES.filter((t) => t.id !== "all").map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Content">
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="atlas-input"
                rows={6}
              />
            </Field>
            <Field label="File (optional)">
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={{ fontSize: 14 }}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" isDisabled={submitting}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showViewer && viewerUrl ? (
        <Modal
          onClose={() => {
            URL.revokeObjectURL(viewerUrl);
            setViewerUrl("");
            setShowViewer(false);
          }}
          title="Document preview"
          width={960}
        >
          <iframe
            src={viewerUrl}
            title="Document preview"
            style={{ width: "100%", height: "70vh", border: "none", borderRadius: 3, background: "var(--n10)" }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, onClose, title, width = 560 }) {
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
          <h2 style={modalTitle}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={modalBody}>{children}</div>
      </div>
    </>
  );
}

function SkeletonTable() {
  return (
    <div style={tableWrap}>
      <div style={{ padding: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 36, background: "var(--n20)", borderRadius: 3, marginBottom: 6 }} />
        ))}
      </div>
    </div>
  );
}

const toolbar = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "16px 0",
};

const searchIcon = {
  position: "absolute",
  left: 8,
  top: 8,
  width: 16,
  height: 16,
  color: "var(--app-muted)",
  pointerEvents: "none",
};

const tableWrap = {
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const tableHeadRow = {
  background: "var(--app-surface-alt)",
};

const th = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--app-muted)",
  padding: "10px 16px",
  borderBottom: "1px solid var(--app-border)",
};

const tableRow = {
  borderBottom: "1px solid var(--app-border-subtle)",
};

const td = {
  padding: "12px 16px",
  fontSize: 14,
  color: "var(--app-text)",
  verticalAlign: "middle",
};

const titleButton = {
  display: "inline-flex",
  alignItems: "flex-start",
  gap: 8,
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  font: "inherit",
  color: "inherit",
  maxWidth: "100%",
};

const titleText = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--app-link)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 480,
};

const excerptText = {
  display: "block",
  marginTop: 2,
  fontSize: 12,
  color: "var(--app-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 480,
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
  borderRadius: 6,
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

const modalTitle = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  color: "var(--app-text)",
};

const modalBody = {
  padding: 20,
  overflowY: "auto",
};
