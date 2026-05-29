import React, { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Field,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const IMPORT_TYPES = [
  { id: "conversations", label: "Conversations" },
  { id: "decisions", label: "Decisions" },
  { id: "documents", label: "Documents" },
  { id: "tasks", label: "Tasks" },
];

const EXPORT_FORMATS = [
  { id: "json", label: "JSON" },
  { id: "csv", label: "CSV" },
];

const PLATFORMS = [
  { id: "jira", label: "Jira" },
  { id: "linear", label: "Linear" },
  { id: "asana", label: "Asana" },
  { id: "trello", label: "Trello" },
  { id: "github", label: "GitHub Issues" },
];

export default function ImportExport() {
  const API_BASE = process.env.REACT_APP_API_URL || "";
  const [tab, setTab] = useState("standard");

  // Standard import/export
  const [importType, setImportType] = useState("conversations");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [exportType, setExportType] = useState("conversations");
  const [exportFormat, setExportFormat] = useState("json");
  const [exporting, setExporting] = useState(false);

  // Platform import
  const [platform, setPlatform] = useState("jira");
  const [platformFile, setPlatformFile] = useState(null);
  const [platformProjectName, setPlatformProjectName] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [platformPreview, setPlatformPreview] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformImporting, setPlatformImporting] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleImport = async () => {
    if (!importFile) {
      setError("Please select a file first");
      return;
    }
    setError("");
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("type", importType);
    try {
      const res = await fetch(`${API_BASE}/api/organizations/import/`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ ok: true, message: `Successfully imported ${data.count || 0} records.` });
        setImportFile(null);
      } else {
        setImportResult({ ok: false, message: data.error || "Import failed" });
      }
    } catch (err) {
      setImportResult({ ok: false, message: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setError("");
    setExporting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/organizations/data-export/?type=${exportType}&format=${exportFormat}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}_export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePlatformPreview = async () => {
    if (!platformFile) {
      setError("Select an export file first");
      return;
    }
    setError("");
    setPlatformLoading(true);
    setPlatformPreview(null);
    const formData = new FormData();
    formData.append("file", platformFile);
    formData.append("platform", platform);
    formData.append("project_name", platformProjectName);
    formData.append("include_context", includeContext ? "true" : "false");
    try {
      const res = await fetch(`${API_BASE}/api/organizations/import/platform/preview/`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPlatformPreview(data.preview || data);
      } else {
        setError(data.error || "Preview failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPlatformLoading(false);
    }
  };

  const handlePlatformImport = async () => {
    if (!platformFile) {
      setError("Select an export file first");
      return;
    }
    setError("");
    setPlatformImporting(true);
    const formData = new FormData();
    formData.append("file", platformFile);
    formData.append("platform", platform);
    formData.append("project_name", platformProjectName);
    formData.append("include_context", includeContext ? "true" : "false");
    try {
      const res = await fetch(`${API_BASE}/api/organizations/import/platform/`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const issues = data?.result?.issues_imported || 0;
        const context = data?.result?.context_imported || 0;
        setImportResult({ ok: true, message: `Imported workflow. Issues: ${issues}, Context: ${context}.` });
        setPlatformFile(null);
        setPlatformProjectName("");
        setPlatformPreview(null);
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPlatformImporting(false);
    }
  };

  const tabs = [
    { id: "standard", label: "Standard" },
    { id: "platform", label: "From other tool" },
    { id: "export", label: "Export" },
  ];

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Import / Export" }]}
        title="Import / Export"
        subtitle="Bring data in from other tools or take your data with you."
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}
      {importResult ? (
        <SectionMessage tone={importResult.ok ? "success" : "error"} style={{ marginTop: 16 }}>
          {importResult.message}
        </SectionMessage>
      ) : null}

      {tab === "standard" ? (
        <Panel
          icon={<ArrowUpTrayIcon style={{ width: 20, height: 20 }} />}
          title="Import data"
          description="Upload a previously exported JSON or CSV file."
        >
          <Field label="Type">
            <select value={importType} onChange={(e) => setImportType(e.target.value)} className="atlas-input">
              {IMPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="File">
            <input type="file" accept=".json,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button appearance="primary" onClick={handleImport} isDisabled={importing || !importFile}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {tab === "platform" ? (
        <Panel
          icon={<DocumentTextIcon style={{ width: 20, height: 20 }} />}
          title="Import from another tool"
          description="Bring a Jira / Linear / Asana / Trello / GitHub export into a new project."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Source">
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="atlas-input">
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Project name">
              <input value={platformProjectName} onChange={(e) => setPlatformProjectName(e.target.value)} className="atlas-input" />
            </Field>
          </div>
          <Field label="Export file">
            <input type="file" onChange={(e) => setPlatformFile(e.target.files?.[0] || null)} />
          </Field>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
            Include context (comments, descriptions, attachments)
          </label>
          {platformPreview ? (
            <SectionMessage tone="info" title="Preview">
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>
                {JSON.stringify(platformPreview, null, 2)}
              </pre>
            </SectionMessage>
          ) : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button appearance="subtle" onClick={handlePlatformPreview} isDisabled={platformLoading || !platformFile}>
              {platformLoading ? "Previewing…" : "Preview"}
            </Button>
            <Button appearance="primary" onClick={handlePlatformImport} isDisabled={platformImporting || !platformFile}>
              {platformImporting ? "Importing…" : "Import"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {tab === "export" ? (
        <Panel
          icon={<ArrowDownTrayIcon style={{ width: 20, height: 20 }} />}
          title="Export data"
          description="Download your workspace data as JSON or CSV."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Type">
              <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="atlas-input">
                {IMPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="atlas-input">
                {EXPORT_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button appearance="primary" onClick={handleExport} isDisabled={exporting}>
              {exporting ? "Exporting…" : "Download"}
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({ icon, title, description, children }) {
  return (
    <section style={{ marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ color: "var(--b400)" }}>{icon}</span>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{title}</h2>
      </div>
      {description ? <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--app-muted)" }}>{description}</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
  );
}
