import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  DocumentCheckIcon,
  FolderIcon,
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
    <div style={{ padding: "0 var(--page-x) 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Decisions" }]}
        title="Decisions"
        subtitle="What your team decided, and why. A decision without its why cannot answer anything later."
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
          description="A decision here records the reasoning behind a choice, so the next person does not have to guess at it."
          primaryAction={<Button appearance="primary" onClick={() => navigate("/decisions/new")}>New decision</Button>}
        />
      ) : (
        <ul style={cardList}>
          {visible.map((d) => (
            <li key={d.id} style={card}>
              <div style={cardTop}>
                <Link to={`/decisions/${d.id}`} style={titleLink}>
                  <span style={cardRef}>DEC-{d.id}</span>
                  <span style={titleText}>{d.title || "Untitled decision"}</span>
                </Link>
                <Lozenge variant={statusToVariant(d.status)}>
                  {(d.status || "proposed").replace(/_/g, " ")}
                </Lozenge>
              </div>

              {/* The why is the body. It was previously searchable and never
                  rendered, which is how a record reaches 44% with nobody
                  noticing: a gap nobody can see is a gap nobody fills. */}
              {d.has_rationale ? (
                <p style={whyText}>{d.rationale}</p>
              ) : (
                <div style={whyMissing}>
                  <span>No why recorded — this decision cannot answer anything later.</span>
                  <Button
                    appearance="subtle"
                    size="sm"
                    onClick={() => navigate(`/decisions/${d.id}?focus=rationale`)}
                  >
                    Add why
                  </Button>
                </div>
              )}

              <div style={cardMeta}>
                {d.pull_request_count ? (
                  <Link to={`/decisions/${d.id}#code`} style={metaLink}>
                    <CodeBracketIcon style={metaIcon} />
                    {d.pull_request_count} pull request{d.pull_request_count === 1 ? "" : "s"}
                  </Link>
                ) : (
                  <span style={metaMuted}>
                    <CodeBracketIcon style={metaIcon} />
                    Not linked to code
                  </span>
                )}

                {d.conversation_id ? (
                  <Link to={`/conversations/${d.conversation_id}`} style={metaLink}>
                    <ChatBubbleLeftRightIcon style={metaIcon} />
                    Source discussion
                  </Link>
                ) : null}

                {d.project_name ? (
                  <span style={metaMuted}>
                    <FolderIcon style={metaIcon} />
                    {d.project_name}
                  </span>
                ) : null}

                <span style={{ flex: 1 }} />

                <span style={metaMuted}>
                  <Avatar size="sm" name={d.decision_maker_name || d.owner_name || "—"} />
                  {d.decision_maker_name || d.owner_name || "Unattributed"}
                </span>
                <span style={metaMuted}>
                  {formatDate(d.decided_at || d.updated_at || d.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
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
const tableWrap = { background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 10, overflow: "hidden" };
const titleLink = { display: "block", color: "inherit", textDecoration: "none" };
const cardList = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 };
const card = { background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 10, padding: "14px 16px" };
const cardTop = { display: "flex", alignItems: "center", gap: 10 };
const cardRef = { fontSize: 12, fontWeight: 600, color: "var(--app-muted)", marginRight: 8, fontVariantNumeric: "tabular-nums" };
/* The reasoning, at reading size. It is the content of the row, not a hint
   under the title, so it gets normal body treatment and room to wrap. */
const whyText = { margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--app-text)", maxWidth: "72ch" };
const whyMissing = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, border: "1px dashed var(--app-border-strong, var(--app-border))", fontSize: 13, color: "var(--app-muted)" };
const cardMeta = { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "var(--app-muted)" };
const metaLink = { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--app-muted)", textDecoration: "none" };
const metaMuted = { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--app-muted)" };
const metaIcon = { width: 13, height: 13 };
const titleText = { display: "block", fontSize: 14, fontWeight: 600, color: "var(--app-text)", letterSpacing: "-0.005em" };
