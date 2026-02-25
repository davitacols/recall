import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentTextIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Documents() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ title: "", description: "", document_type: "other", content: "", tags: [] });
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/`, { headers: { Authorization: `Bearer ${token}` } });
      setDocuments(await res.json());
    } catch (error) {
      console.error("Error:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/documents/search/?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(await res.json());
    } catch (error) {
      console.error("Error:", error);
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
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.file_name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
      navigate(`/business/documents/${doc.id}`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 130, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>KNOWLEDGE DOCUMENTS</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Documents</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Policies, procedures, and internal references.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Document</button>
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10, marginBottom: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            type="text"
            placeholder="Search documents"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            style={ui.input}
          />
          <button onClick={handleSearch} style={{ ...ui.secondaryButton, padding: "9px 10px" }}>
            <MagnifyingGlassIcon style={{ width: 16, height: 16 }} />
          </button>
        </section>

        {documents.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No documents found.
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
            {documents.map((doc) => (
              <article key={doc.id} onClick={() => handleOpenDocument(doc)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <DocumentTextIcon style={{ width: 16, height: 16, color: palette.muted, marginTop: 1 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{doc.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted, lineHeight: 1.4 }}>{doc.description || "No description"}</p>
                    {doc.has_file && doc.file_name && <p style={{ margin: "6px 0 0", fontSize: 11, color: palette.muted }}>{doc.file_name}</p>}
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: palette.muted, border: `1px solid ${palette.border}`, borderRadius: 999, padding: "3px 8px", textTransform: "capitalize", fontWeight: 700 }}>
                    {doc.document_type}
                  </span>
                  <button onClick={(event) => { event.stopPropagation(); navigate(`/business/documents/${doc.id}`); }} style={{ ...ui.secondaryButton, padding: "7px 10px", fontSize: 12 }}>
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {showViewer && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "grid", placeItems: "center", zIndex: 130 }} onClick={() => setShowViewer(false)}>
            <div style={{ width: "100%", height: "100%", padding: 12 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button onClick={() => setShowViewer(false)} style={{ ...ui.secondaryButton, color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>Close</button>
              </div>
              <iframe src={viewerUrl} style={{ width: "100%", height: "calc(100vh - 70px)", background: "#fff", border: "none", borderRadius: 8 }} title="Document" />
            </div>
          </div>
        )}

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(760px,100%)", maxHeight: "90vh", overflowY: "auto", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Create Document</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
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
                <textarea rows={3} placeholder="Description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                <textarea rows={8} placeholder="Content" value={formData.content} onChange={(event) => setFormData({ ...formData, content: event.target.value })} style={ui.input} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" style={ui.primaryButton}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
