import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../components/Toast";
import {
  Breadcrumb,
  Button,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import { useAgentContextHint, useAgentDock } from "../components/AgentDock";
import BeforeYouCreate from "../components/BeforeYouCreate";
import "./CreateIssue.css";

const PRIORITIES = [
  { value: "lowest", label: "Lowest" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "highest", label: "Highest" },
];

const ISSUE_TYPES = [
  { value: "task", label: "Task" },
  { value: "story", label: "Story" },
  { value: "bug", label: "Bug" },
  { value: "epic", label: "Epic" },
  { value: "subtask", label: "Subtask" },
];

const STATUS_TONE = {
  done: "success",
  closed: "success",
  resolved: "success",
  in_progress: "inprogress",
  in_review: "inprogress",
  testing: "moved",
  backlog: "default",
  todo: "default",
};

export default function CreateIssue() {
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const agentDock = useAgentDock();

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    issue_type: "task",
    priority: "medium",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useAgentContextHint({
    kind: "issue-draft",
    label: form.title ? `Draft issue · ${form.title.slice(0, 40)}` : "New issue",
    goalPrefix: form.title
      ? `I'm drafting an issue titled "${form.title}". Help me find similar past issues and decide if this is the right approach. `
      : "Help me think through a new issue. Find similar past issues and decide if this is the right approach. ",
    profile_slug: "sprint-coach",
  });

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/agile/projects/")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setProjects(list);
        if (list.length && !projectId) setProjectId(String(list[0].id));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !projectId) {
      setError("Title and project are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        issue_type: form.issue_type,
        priority: form.priority,
      };
      const { data } = await api.post(`/api/agile/projects/${projectId}/issues/`, payload);
      const newId = data?.id || data?.data?.id;
      toast.success?.("Issue created");
      if (newId) navigate(`/issues/${newId}`);
      else navigate("/projects/" + projectId);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Could not create issue."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ci">
      <div style={{ padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton
            icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />}
            label="Back"
            onClick={() => navigate(-1)}
          />
          <Breadcrumb
            items={[
              { label: "Knoledgr", to: "/" },
              { label: "Projects", to: "/projects" },
              { label: "New issue" },
            ]}
          />
        </div>
      </div>

      <div style={{ padding: "0 32px" }}>
        <PageHeader
          title="New issue"
          subtitle="As you draft, we'll surface similar past issues and how they were resolved — so you don't reopen ground that's already been worked."
          actions={
            <Button
              appearance="subtle"
              iconBefore={<BoltIcon style={{ width: 14, height: 14 }} />}
              onClick={() => agentDock.open()}
              title="Ask the sprint-coach agent (⌘J)"
            >
              Ask Agent
            </Button>
          }
          style={{ padding: "0", marginTop: 12, background: "transparent" }}
        />
      </div>

      <div className="ci-grid" style={{ padding: "16px 32px 32px" }}>
        <section className="ci-main">
          {error ? (
            <SectionMessage tone="error" style={{ marginBottom: 12 }}>
              {error}
            </SectionMessage>
          ) : null}

          <form onSubmit={handleSubmit} className="ci-form">
            <Field label="Project" isRequired>
              <select
                className="atlas-input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Title"
              isRequired
              helpText="Be specific — past similar issues surface from this."
            >
              <input
                className="atlas-input"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Auth token refresh fails after 24h"
                required
                autoFocus
              />
            </Field>

            <Field label="Description">
              <textarea
                className="atlas-input"
                rows={6}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Repro steps, expected vs. actual, scope…"
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Type">
                <select
                  className="atlas-input"
                  value={form.issue_type}
                  onChange={(e) => setField("issue_type", e.target.value)}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className="atlas-input"
                  value={form.priority}
                  onChange={(e) => setField("priority", e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="ci-actions">
              <Button
                appearance="subtle"
                type="button"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                type="submit"
                isDisabled={submitting || !form.title.trim() || !projectId}
              >
                {submitting ? "Saving…" : "Create issue"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="ci-side">
          <BeforeYouCreate
            endpoint="/api/agile/intelligence/similar-issues/"
            title={form.title}
            description={form.description}
            surface="issues"
            heroTitle="Before you create"
            heroSub="Similar past issues, with how they were resolved."
            driftLabel={(item) =>
              item.is_resolved
                ? ""
                : item.priority === "highest" || item.priority === "high"
                ? "high-priority open"
                : ""
            }
            emptyHint="Start typing a title — we'll surface past issues that touched similar ground."
            renderItem={(it) => (
              <li
                key={it.id}
                className={`byc-card ci-similar ${it.is_resolved ? "is-resolved" : ""}`}
              >
                <div className="byc-card-head">
                  <Link to={it.url} className="byc-card-title">
                    {it.title}
                  </Link>
                  <span
                    className="ci-similar-state"
                    style={{
                      background: it.is_resolved
                        ? "rgba(0, 135, 90, 0.12)"
                        : "rgba(38, 132, 255, 0.12)",
                      color: it.is_resolved ? "#00875A" : "#2684FF",
                    }}
                  >
                    {it.is_resolved ? <CheckCircleIcon /> : null}
                    {it.is_resolved ? "Resolved" : it.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="byc-card-meta">
                  <Lozenge>{it.key}</Lozenge>
                  <Lozenge>{it.issue_type}</Lozenge>
                  <Lozenge variant={STATUS_TONE[it.status] || "default"}>
                    {it.priority}
                  </Lozenge>
                  {it.project_name ? (
                    <span style={{ fontSize: 11.5, color: "var(--app-muted)" }}>
                      {it.project_name}
                    </span>
                  ) : null}
                </div>
                <div className="byc-card-foot">
                  <span>
                    {it.assignee
                      ? "Owned by " + (it.assignee.name || "—")
                      : "Unassigned"}
                  </span>
                  <Link to={it.url} className="byc-card-open">
                    Open <ChevronRightIcon />
                  </Link>
                </div>
              </li>
            )}
          />
        </aside>
      </div>
    </div>
  );
}
