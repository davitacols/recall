import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CommandLineIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import {
  Avatar,
  Breadcrumb,
  Button,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";
import "./AgentAudit.css";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const OUTCOME_META = {
  approved: { label: "Approved & ran", color: "#00875A", icon: CheckCircleIcon },
  executed: { label: "Executed", color: "#00875A", icon: CheckCircleIcon },
  denied: { label: "Denied", color: "#DE350B", icon: NoSymbolIcon },
  errored: { label: "Errored", color: "#FF8B00", icon: ExclamationTriangleIcon },
  pending: { label: "Awaiting", color: "#7A869A", icon: ClockIcon },
};

function timeAgo(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
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

function summarizeInput(input) {
  if (!input || typeof input !== "object") return "";
  const entries = Object.entries(input).slice(0, 3);
  return entries
    .map(([k, v]) => {
      const display =
        typeof v === "string"
          ? `"${v.length > 24 ? v.slice(0, 23) + "…" : v}"`
          : typeof v === "object"
          ? "{…}"
          : String(v);
      return `${k}=${display}`;
    })
    .join(", ");
}

export default function AgentAudit() {
  const [data, setData] = useState({ events: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    days: "30",
    write_only: true,
    outcome: "all",
  });

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: filters.days,
        write_only: filters.write_only ? "true" : "false",
      });
      const { data } = await api.get(`/api/knowledge/ai/agent/audit/?${params.toString()}`);
      setData(data || { events: [], totals: {} });
    } catch (err) {
      if (err?.response?.status === 403) {
        setError("Audit log is admin-only.");
      } else {
        setError(err?.response?.data?.error || err?.message || "Could not load audit log");
      }
    } finally {
      setLoading(false);
    }
  }, [filters.days, filters.write_only]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEvents = useMemo(() => {
    if (filters.outcome === "all") return data.events;
    return data.events.filter((e) => e.outcome === filters.outcome);
  }, [data.events, filters.outcome]);

  const totals = data.totals || {};

  return (
    <div className="aa">
      <div style={{ padding: "24px 32px 0" }}>
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Agent", to: "/agent" },
            { label: "Audit log" },
          ]}
        />
      </div>

      <div style={{ padding: "0 32px" }}>
        <PageHeader
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <span className="aa-title-mark">
                <ShieldCheckIcon />
              </span>
              Agent Audit
            </span>
          }
          subtitle="Every agent write action across the workspace — who started the run, what was proposed, who approved or denied it. Read-only and admin-gated."
          actions={
            <Button
              appearance="subtle"
              iconBefore={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
              onClick={load}
              isDisabled={loading}
            >
              Refresh
            </Button>
          }
          style={{ padding: "0", marginTop: 12, background: "transparent" }}
        />
      </div>

      {error ? (
        <div style={{ padding: "16px 32px 0" }}>
          <SectionMessage tone="error">{error}</SectionMessage>
        </div>
      ) : null}

      <div style={{ padding: "16px 32px 32px" }}>
        <section className="aa-tiles">
          <Tile label="Runs" value={totals.runs || 0} color="#6E56FF" />
          <Tile label="Write attempts" value={totals.write_attempts || 0} color="#2684FF" />
          <Tile label="Approved" value={totals.approved || 0} color="#00875A" />
          <Tile label="Denied" value={totals.denied || 0} color="#DE350B" />
          <Tile label="Errored" value={totals.errored || 0} color="#FF8B00" />
          <Tile label="Pending" value={totals.pending || 0} color="#7A869A" />
        </section>

        <section className="aa-filters">
          <div className="aa-filter">
            <span className="aa-filter-label">Window</span>
            <select
              className="atlas-input"
              value={filters.days}
              onChange={(e) => setFilters((f) => ({ ...f, days: e.target.value }))}
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="aa-filter">
            <span className="aa-filter-label">Outcome</span>
            <select
              className="atlas-input"
              value={filters.outcome}
              onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="errored">Errored</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <label className="aa-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.write_only}
              onChange={(e) => setFilters((f) => ({ ...f, write_only: e.target.checked }))}
            />
            Write actions only
          </label>
        </section>

        {loading ? (
          <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading audit log…</div>
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            icon={<ShieldCheckIcon style={{ width: "100%", height: "100%" }} />}
            title="No agent activity in this window"
            description="When agents propose writes or run actions, they'll appear here with the actor, the inputs, and the outcome."
          />
        ) : (
          <ul className="aa-events">
            {visibleEvents.map((e, i) => (
              <AuditRow key={`${e.run_id}-${e.tool_call_id || i}`} event={e} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, color }) {
  return (
    <div className="aa-tile">
      <span className="aa-tile-dot" style={{ background: color }} />
      <div>
        <p className="aa-tile-label">{label}</p>
        <p className="aa-tile-value">{value}</p>
      </div>
    </div>
  );
}

function AuditRow({ event }) {
  const meta = OUTCOME_META[event.outcome] || OUTCOME_META.pending;
  const Icon = meta.icon;
  return (
    <li className={`aa-event aa-event--${event.outcome}`}>
      <span className="aa-event-icon" style={{ background: `${meta.color}1f`, color: meta.color }}>
        <Icon />
      </span>
      <div className="aa-event-body">
        <div className="aa-event-head">
          <code className="aa-event-tool">{event.tool_name}</code>
          {event.is_write ? <Lozenge variant="moved">write</Lozenge> : <Lozenge>read</Lozenge>}
          <span
            className="aa-event-outcome"
            style={{ background: `${meta.color}1f`, color: meta.color }}
          >
            <Icon /> {meta.label}
          </span>
          <span className="aa-event-time">
            <ClockIcon /> {timeAgo(event.ts)}
          </span>
        </div>

        <p className="aa-event-args">
          <CommandLineIcon />
          <span>{summarizeInput(event.tool_input)}</span>
        </p>

        <div className="aa-event-foot">
          {event.actor ? (
            <span className="aa-event-actor">
              <Avatar size="sm" name={event.actor.name || event.actor.email || "?"} />
              <span>{event.actor.name || event.actor.email}</span>
            </span>
          ) : null}
          <span className="aa-event-run">
            Run:{" "}
            <Link to={`/agent/${event.run_id}`}>
              #{event.run_id} <ArrowRightIcon />
            </Link>
          </span>
          {event.run_goal ? (
            <span className="aa-event-goal" title={event.run_goal}>
              <EyeIcon /> {event.run_goal.slice(0, 80)}
              {event.run_goal.length > 80 ? "…" : ""}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
