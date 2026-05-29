import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";
import "./Projects.css";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function projectColor(slug) {
  const palette = ["#5E6AD2", "#3FB68B", "#8A63D2", "#E5677A", "#4BA3C7", "#E0913A", "#6E76E0", "#5B8DEF"];
  let h = 0;
  const s = String(slug || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function projectInitial(name, slug) {
  const source = name || slug || "P";
  return source.trim().charAt(0).toUpperCase();
}

const TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "starred", label: "Starred" },
  { id: "recent", label: "Recent" },
];

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", key: "", description: "", lead_id: "" });
  const [stars, setStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("atlasProjectStars") || "{}") || {};
    } catch (_) {
      return {};
    }
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/api/agile/projects/").catch(() => ({ data: [] })),
      api.get("/api/organizations/members/").catch(() => ({ data: [] })),
    ]).then(([projRes, memRes]) => {
      if (!mounted) return;
      const list = Array.isArray(projRes?.data) ? projRes.data : projRes?.data?.results || [];
      setProjects(list);
      setMembers(Array.isArray(memRes?.data) ? memRes.data : memRes?.data?.results || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setShowCreate(true);
  }, []);

  const toggleStar = (id) => {
    setStars((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      try {
        localStorage.setItem("atlasProjectStars", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const visible = useMemo(() => {
    let list = projects;
    if (tab === "starred") list = list.filter((p) => stars[p.id]);
    if (tab === "recent") {
      list = [...list].sort((a, b) => {
        const ad = new Date(a.updated_at || a.created_at || 0).getTime();
        const bd = new Date(b.updated_at || b.created_at || 0).getTime();
        return bd - ad;
      }).slice(0, 25);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name || ""} ${p.key || ""} ${p.slug || ""} ${p.description || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [projects, tab, search, stars]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback("");
    try {
      const payload = {
        name: form.name.trim(),
        key: form.key.trim().toUpperCase() || form.name.trim().slice(0, 4).toUpperCase(),
        description: form.description.trim(),
      };
      if (form.lead_id) payload.lead_id = form.lead_id;
      const { data } = await api.post("/api/agile/projects/", payload);
      setShowCreate(false);
      setForm({ name: "", key: "", description: "", lead_id: "" });
      setProjects((prev) => [data, ...prev]);
      toast.success?.("Project created");
      if (data?.id) navigate(`/projects/${data.id}`);
    } catch (err) {
      setFeedback(err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Could not create project");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = TYPE_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count:
      t.id === "starred"
        ? Object.keys(stars).length
        : t.id === "all"
        ? projects.length
        : Math.min(projects.length, 25),
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Projects" }]}
        title="Projects"
        subtitle="Browse and create projects across your workspace."
        actions={
          <Button
            appearance="primary"
            iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />}
            onClick={() => setShowCreate(true)}
          >
            Create project
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      <div style={{ marginTop: 16 }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="proj-toolbar">
        <div className="proj-search">
          <MagnifyingGlassIcon />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            className="atlas-input"
          />
        </div>
        {!loading && visible.length ? (
          <span className="proj-count">{visible.length} project{visible.length === 1 ? "" : "s"}</span>
        ) : null}
      </div>

      {loading ? (
        <SkeletonTable />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CubeIcon style={{ width: "100%", height: "100%" }} />}
          title={tab === "starred" ? "Nothing starred yet" : "No projects"}
          description={
            tab === "starred"
              ? "Click the star next to a project to pin it here."
              : "Create your first project to start tracking work."
          }
          primaryAction={
            tab === "starred" ? null : (
              <Button appearance="primary" onClick={() => setShowCreate(true)}>
                Create project
              </Button>
            )
          }
        />
      ) : (
        <div className="proj-grid">
          {visible.map((p) => {
            const id = p.id;
            const starred = !!stars[id];
            const href = `/projects/${id}`;
            const lead = p.lead_name || p.lead || "Unassigned";
            return (
              <Link key={id} to={href} className="proj-card">
                <div className="proj-card-top">
                  <span className="proj-mark" style={{ background: projectColor(p.slug || p.key) }}>
                    {projectInitial(p.name, p.slug)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStar(id); }}
                    aria-label={starred ? "Unstar" : "Star"}
                    className={`proj-star ${starred ? "is-on" : ""}`}
                  >
                    {starred ? <StarSolidIcon /> : <StarIcon />}
                  </button>
                </div>
                <div className="proj-body">
                  <span className="proj-name">{p.name || p.slug || "Untitled"}</span>
                  <p className="proj-desc">{p.description || "No description yet."}</p>
                </div>
                <div className="proj-foot">
                  <span className="proj-lead">
                    <Avatar size="xs" name={lead} />
                    <span>{lead}</span>
                  </span>
                  <span className="proj-meta">
                    <span className="proj-key">{p.key || (p.slug || "").toUpperCase()}</span>
                    <span className="proj-updated">{formatDate(p.updated_at || p.created_at)}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate ? (
        <Modal title="Create project" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name" isRequired>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="atlas-input"
                autoFocus
                required
              />
            </Field>
            <Field label="Key" helpText="A short identifier shown in issue keys (e.g. RECL).">
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                className="atlas-input"
                maxLength={10}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="atlas-input"
                rows={4}
              />
            </Field>
            <Field label="Project lead">
              <select
                value={form.lead_id}
                onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                className="atlas-input"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id || m.user_id} value={m.id || m.user_id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </Field>
            {feedback ? <SectionMessage tone="error">{feedback}</SectionMessage> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !form.name.trim()}>
                {submitting ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, onClose, title, width = 520 }) {
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
    <div className="proj-skel">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="proj-skel-card" />
      ))}
    </div>
  );
}

const modalBackdrop = { position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 };
const modalShell = { position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" };
const modalHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" };
const modalTitle = { margin: 0, fontSize: 16, fontWeight: 600, color: "var(--app-text)" };
const modalBody = { padding: 20, overflowY: "auto" };
