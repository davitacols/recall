import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "proposed", label: "Proposed" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "implemented", label: "Implemented" },
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

function statusToVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "proposed") return "new";
  if (s === "under_review") return "inprogress";
  if (s === "approved") return "success";
  if (s === "implemented") return "success";
  if (s === "rejected" || s === "cancelled") return "removed";
  return "default";
}

export default function Decisions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    let mounted = true;
    api.get("/api/decisions/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || res.data?.results || res.data || [];
        setDecisions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err?.message || "Failed to load decisions");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextStatus = params.get("status");
    if (nextStatus && STATUS_TABS.some((t) => t.id === nextStatus)) setTab(nextStatus);
    const nextQuery = params.get("q") || "";
    if (nextQuery) setSearch(nextQuery);
  }, [location.search]);

  const visible = useMemo(() => {
    let list = decisions;
    if (tab !== "all") list = list.filter((d) => (d.status || "").toLowerCase() === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const hay = `${d.title || ""} ${d.summary || ""} ${d.rationale || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort === "recent") list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sort === "oldest") list = [...list].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sort === "title") list = [...list].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return list;
  }, [decisions, tab, search, sort]);

  const tabs = STATUS_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? decisions.length : decisions.filter((d) => (d.status || "").toLowerCase() === t.id).length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Decisions" }]}
        title="Decisions"
        subtitle="Track committed choices, rationale, and impact across the workspace."
        actions={
          <>
            <Button
              appearance="subtle"
              iconBefore={<ChartBarIcon style={{ width: 14, height: 14 }} />}
              onClick={() => navigate("/decisions/intelligence")}
              title="Workspace scorecard: predicted outcomes vs. reality"
            >
              Intelligence
            </Button>
            <Button appearance="subtle" iconBefore={<SparklesIcon style={{ width: 14, height: 14 }} />} onClick={() => navigate("/decision-proposals")}>
              Proposals
            </Button>
            <Button
              appearance="primary"
              iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
              onClick={() => navigate("/decisions/new")}
            >
              New decision
            </Button>
          </>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div style={toolbar}>
        <div style={{ position: "relative", maxWidth: 360, flex: 1 }}>
          <MagnifyingGlassIcon style={searchIcon} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search decisions"
            className="atlas-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--app-muted)" }}>Sort:</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="atlas-input" style={{ width: 160 }}>
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      {error ? <SectionMessage tone="error" style={{ marginBottom: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <SkeletonTable />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<DocumentCheckIcon style={{ width: "100%", height: "100%" }} />}
          title={tab === "all" ? "No decisions yet" : "No decisions in this state"}
          description="Capture a decision to record the rationale and lock in the outcome."
          primaryAction={<Button appearance="primary" onClick={() => navigate("/decisions/new")}>New decision</Button>}
        />
      ) : (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeadRow}>
                <th style={{ ...th, width: "45%" }}>Title</th>
                <th style={th}>Status</th>
                <th style={th}>Owner</th>
                <th style={th}>Impact</th>
                <th style={th}>Decided</th>
                <th style={{ ...th, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id} style={tableRow}>
                  <td style={td}>
                    <Link to={`/decisions/${d.id}`} style={titleLink}>
                      <span style={titleText}>{d.title || "Untitled decision"}</span>
                      {d.summary ? <span style={excerptText}>{stripHtml(d.summary).slice(0, 160)}</span> : null}
                    </Link>
                  </td>
                  <td style={td}>
                    <Lozenge variant={statusToVariant(d.status)}>{(d.status || "proposed").replace(/_/g, " ")}</Lozenge>
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Avatar size="sm" name={d.owner_name || d.author_name || d.created_by_name || "—"} />
                      <span style={{ fontSize: 13, color: "var(--app-text)" }}>{d.owner_name || d.author_name || d.created_by_name || "—"}</span>
                    </span>
                  </td>
                  <td style={td}>
                    {d.impact ? <Lozenge>{d.impact}</Lozenge> : <span style={{ color: "var(--app-text-disabled)", fontSize: 13 }}>—</span>}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: "var(--app-muted)" }}>{formatDate(d.decided_at || d.updated_at || d.created_at)}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button appearance="subtle" size="sm" onClick={() => navigate(`/decisions/${d.id}`)}>Open</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

const toolbar = { display: "flex", alignItems: "center", gap: 8, padding: "16px 0" };
const searchIcon = { position: "absolute", left: 8, top: 8, width: 16, height: 16, color: "var(--app-muted)", pointerEvents: "none" };
const tableWrap = { background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const tableHeadRow = { background: "var(--app-surface-alt)" };
const th = { textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--app-muted)", padding: "10px 16px", borderBottom: "1px solid var(--app-border)" };
const tableRow = { borderBottom: "1px solid var(--app-border-subtle)" };
const td = { padding: "12px 16px", fontSize: 14, color: "var(--app-text)", verticalAlign: "middle" };
const titleLink = { display: "block", color: "inherit", textDecoration: "none" };
const titleText = { display: "block", fontSize: 14, fontWeight: 600, color: "var(--app-link)" };
const excerptText = { display: "block", marginTop: 2, fontSize: 12, color: "var(--app-muted)", maxWidth: 540, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
