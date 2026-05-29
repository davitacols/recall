import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

function timeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const sec = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[i]}`;
}

function fileIcon(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("image")) return { icon: PhotoIcon, color: "var(--p400)" };
  if (t.includes("pdf") || t.includes("doc") || t.includes("text")) return { icon: DocumentTextIcon, color: "var(--b400)" };
  return { icon: DocumentIcon, color: "var(--n300)" };
}

export default function Files() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.get("/api/conversations/documents/all/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
        setFiles(list);
      })
      .catch((err) => mounted && setError(err?.response?.data?.detail || err?.message || "Failed to load files"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Files" }]}
        title="Files"
        subtitle="Attachments shared across conversations and pages."
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 48, background: "var(--n20)", borderRadius: 4, marginBottom: 6 }} />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<PaperClipIcon style={{ width: "100%", height: "100%" }} />}
          title="No files yet"
          description="When teammates attach files, they'll appear here."
        />
      ) : (
        <div style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--app-surface-alt)" }}>
                <th style={th}>Name</th>
                <th style={th}>Type</th>
                <th style={th}>Size</th>
                <th style={th}>Uploaded by</th>
                <th style={th}>When</th>
                <th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const meta = fileIcon(f.file_type || f.mime_type);
                const Icon = meta.icon;
                return (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--app-border-subtle)" }}>
                    <td style={td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Icon style={{ width: 16, height: 16, color: meta.color, flexShrink: 0 }} />
                        <Link
                          to={f.url || f.file_url || `/conversations/${f.conversation_id || f.parent_id}`}
                          style={{ color: "var(--app-link)", textDecoration: "none", fontWeight: 500 }}
                        >
                          {f.file_name || f.title || "Untitled"}
                        </Link>
                      </span>
                    </td>
                    <td style={td}>
                      <Lozenge>{f.file_type?.split("/")?.[1] || f.file_type || "file"}</Lozenge>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatBytes(f.file_size || f.size)}</span>
                    </td>
                    <td style={td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Avatar size="sm" name={f.uploaded_by_name || f.created_by_name || "User"} />
                        <span style={{ fontSize: 13 }}>{f.uploaded_by_name || f.created_by_name || "—"}</span>
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{timeAgo(f.created_at || f.uploaded_at)}</span>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {f.url || f.file_url ? (
                        <Button appearance="subtle" size="sm" iconBefore={<ArrowDownTrayIcon style={{ width: 12, height: 12 }} />} onClick={() => window.open(f.url || f.file_url)}>
                          Download
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tableWrap = { marginTop: 16, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" };
const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const td = { padding: "10px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
