import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketSquareIcon,
  DocumentCheckIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

const FALLBACK_STEPS = [
  {
    id: "connect_github",
    title: "Connect GitHub",
    description: "Install the Knoledgr GitHub App and choose only the repositories this workspace may read.",
    to: "/integrations/github",
    cta: "Connect GitHub",
  },
  {
    id: "enable_repository",
    title: "Enable a repository",
    description: "Select one repository for decision capture. Repositories you do not enable stay out of Knoledgr.",
    to: "/integrations/github",
    cta: "Choose repository",
  },
  {
    id: "capture_discussion",
    title: "Capture a pull-request discussion",
    description: "Import past merged pull requests or merge a new PR with a substantive team discussion.",
    to: "/integrations/github",
    cta: "Import PR history",
  },
  {
    id: "record_decision",
    title: "Turn the discussion into a decision",
    description: "Review a captured conversation and preserve the choice, rationale, and source evidence.",
    to: "/conversations",
    cta: "Review conversations",
  },
  {
    id: "ask_recall",
    title: "Ask Recall why it happened",
    description: "Ask a question about the decision and verify that the answer cites workspace evidence.",
    to: "/ask",
    cta: "Open Ask Recall",
  },
];

const STEP_ICONS = {
  connect_github: CodeBracketSquareIcon,
  enable_repository: CodeBracketSquareIcon,
  capture_discussion: ArrowDownTrayIcon,
  record_decision: DocumentCheckIcon,
  ask_recall: ChatBubbleLeftRightIcon,
};

export default function Onboarding() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/knowledge/onboarding/")
      .then((res) => mounted && setData(res.data))
      .catch((err) => mounted && setError(err?.response?.data?.detail || ""))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const steps = useMemo(() => {
    const apiSteps = Array.isArray(data?.steps) && data.steps.length
      ? data.steps
      : data?.onboarding_progress?.checklist;

    if (Array.isArray(apiSteps) && apiSteps.length) {
      return apiSteps.map((s) => ({
        id: s.id,
        icon: STEP_ICONS[s.id] || SparklesIcon,
        title: s.title || s.label,
        description: s.description,
        to: s.url || s.path || s.href || "/dashboard",
        cta: s.cta || "Open",
        completed: Boolean(s.completed ?? s.complete),
      }));
    }
    return FALLBACK_STEPS.map((step) => ({
      ...step,
      icon: STEP_ICONS[step.id] || SparklesIcon,
      completed: false,
    }));
  }, [data]);

  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading onboarding…</div>;
  }

  return (
    <div style={{ padding: "0 var(--page-x) 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Get started" }]}
        title={data?.organization_name ? `Welcome to ${data.organization_name}` : "Welcome to Knoledgr"}
        subtitle="Connect one repository, preserve one decision, and prove that your team can find the why later."
        actions={
          <Button appearance="primary" iconBefore={<RocketLaunchIcon style={{ width: 14, height: 14 }} />} onClick={() => (window.location.href = "/dashboard")}>
            Skip & explore
          </Button>
        }
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={progressCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{completed} of {total} steps complete</span>
          <span style={{ fontSize: 12, color: "var(--app-muted)" }}>{percent}%</span>
        </div>
        <div style={progressTrack}>
          <div style={{ ...progressFill, width: `${percent}%` }} />
        </div>
      </div>

      <ul style={stepList}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.id || i} style={stepRow}>
              <span style={{ ...stepIcon, color: s.completed ? "var(--g500)" : "var(--b400)" }}>
                {s.completed ? <CheckCircleIcon style={{ width: 20, height: 20 }} /> : <Icon style={{ width: 20, height: 20 }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.title}</p>
                  {s.completed ? <Lozenge variant="success">Done</Lozenge> : null}
                </div>
                {s.description ? <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--app-muted)" }}>{s.description}</p> : null}
              </div>
              <Link to={s.to} style={{ textDecoration: "none" }}>
                <Button appearance={s.completed ? "subtle" : "default"} iconAfter={<ArrowRightIcon style={{ width: 12, height: 12 }} />}>
                  {s.cta || "Open"}
                </Button>
              </Link>
            </li>
          );
        })}
      </ul>

      {steps.length === 0 ? (
        <EmptyState title="You're set up" description="Jump back into your workspace." primaryAction={<Button appearance="primary" onClick={() => (window.location.href = "/dashboard")}>Go to dashboard</Button>} />
      ) : null}
    </div>
  );
}

const progressCard = {
  marginTop: 16,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const progressTrack = {
  height: 6,
  background: "var(--n30)",
  borderRadius: 999,
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, var(--b400), var(--g400))",
  transition: "width 240ms cubic-bezier(0.2, 0, 0, 1)",
};

const stepList = {
  listStyle: "none",
  margin: "16px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const stepRow = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 16,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
};

const stepIcon = {
  width: 32,
  height: 32,
  borderRadius: 4,
  background: "var(--app-surface-alt)",
  display: "inline-grid",
  placeItems: "center",
  flexShrink: 0,
};
