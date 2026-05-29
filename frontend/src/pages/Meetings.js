import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
  Tabs,
} from "../components/atlas";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayLabel(ts) {
  const today = startOfDay(new Date());
  const tomorrow = today + 86400000;
  const yest = today - 86400000;
  if (ts === today) return "Today";
  if (ts === tomorrow) return "Tomorrow";
  if (ts === yest) return "Yesterday";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function Meetings() {
  const navigate = useNavigate();
  const apiBase = process.env.REACT_APP_API_URL || "";
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    meeting_date: "",
    duration_minutes: 60,
    location: "",
  });

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/business/meetings/`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load meetings");
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(err.message);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/business/meetings/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to schedule meeting");
      setShowModal(false);
      setForm({ title: "", description: "", meeting_date: "", duration_minutes: 60, location: "" });
      await fetchMeetings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visible = useMemo(() => {
    const now = Date.now();
    let list = meetings;
    if (tab === "upcoming") list = list.filter((m) => new Date(m.meeting_date).getTime() >= now);
    if (tab === "past") list = list.filter((m) => new Date(m.meeting_date).getTime() < now);
    return [...list].sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));
  }, [meetings, tab]);

  const grouped = useMemo(() => {
    const groups = new Map();
    for (const m of visible) {
      const key = startOfDay(m.meeting_date || Date.now());
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    const sorted = Array.from(groups.entries()).sort((a, b) => (tab === "past" ? b[0] - a[0] : a[0] - b[0]));
    return sorted;
  }, [visible, tab]);

  const tabs = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count: t.id === "all" ? meetings.length : visible.length,
  }));

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <PageHeader
        breadcrumb={[{ label: "Knoledgr", to: "/" }, { label: "Meetings" }]}
        title="Meetings"
        subtitle="Plan and review meeting outcomes with context."
        actions={
          <Button appearance="primary" iconBefore={<PlusIcon style={{ width: 14, height: 14 }} />} onClick={() => setShowModal(true)}>
            Schedule meeting
          </Button>
        }
        tabs={<Tabs tabs={tabs} value={tab} onChange={setTab} />}
        style={{ padding: "24px 0 0", background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      {loading ? (
        <div style={{ marginTop: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 64, background: "var(--n20)", borderRadius: 4, marginBottom: 8 }} />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon style={{ width: "100%", height: "100%" }} />}
          title="No meetings scheduled"
          description="Schedule a meeting to capture context, outcomes, and follow-ups."
          primaryAction={<Button appearance="primary" onClick={() => setShowModal(true)}>Schedule meeting</Button>}
        />
      ) : (
        <div style={{ marginTop: 16 }}>
          {grouped.map(([key, group]) => (
            <section key={key}>
              <h3 style={dayHeading}>{dayLabel(key)}</h3>
              <div style={list}>
                {group.map((m) => {
                  const start = new Date(m.meeting_date);
                  const end = new Date(start.getTime() + (m.duration_minutes || 60) * 60000);
                  const isPast = end.getTime() < Date.now();
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => navigate(`/business/meetings/${m.id}`)}
                      style={meetingRow}
                    >
                      <div style={{ width: 64, flexShrink: 0, textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{formatTime(m.meeting_date)}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)" }}>{formatTime(end)}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--app-text)" }}>{m.title}</p>
                          {isPast ? <Lozenge variant="default">Past</Lozenge> : <Lozenge variant="inprogress">Upcoming</Lozenge>}
                        </div>
                        {m.description ? (
                          <p style={meetingDesc}>{m.description}</p>
                        ) : null}
                        <div style={metaRow}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <ClockIcon style={{ width: 12, height: 12 }} /> {m.duration_minutes || 60} min
                          </span>
                          {m.location ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <MapPinIcon style={{ width: 12, height: 12 }} /> {m.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {Array.isArray(m.attendees) && m.attendees.length ? (
                        <div style={{ display: "flex" }}>
                          {m.attendees.slice(0, 4).map((a, i) => (
                            <span key={i} style={{ marginLeft: i ? -6 : 0, border: "2px solid var(--app-surface)", borderRadius: "50%" }}>
                              <Avatar size="sm" name={a.full_name || a.email || ""} />
                            </span>
                          ))}
                          {m.attendees.length > 4 ? (
                            <span style={{ marginLeft: -6, width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--app-surface)", background: "var(--n30)", display: "inline-grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "var(--app-muted)" }}>
                              +{m.attendees.length - 4}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {showModal ? (
        <Modal title="Schedule meeting" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Title" isRequired>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required autoFocus />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" rows={3} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="When" isRequired>
                <input type="datetime-local" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} className="atlas-input" required />
              </Field>
              <Field label="Duration (min)">
                <input type="number" min="15" step="15" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="atlas-input" />
              </Field>
            </div>
            <Field label="Location / link">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="atlas-input" placeholder="https://… or room name" />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <Button type="button" appearance="subtle" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" appearance="primary" isDisabled={submitting || !form.title.trim() || !form.meeting_date}>
                {submitting ? "Saving…" : "Schedule"}
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
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--app-overlay)", zIndex: 199 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", width, maxWidth: "calc(100vw - 32px)", background: "var(--app-surface-overlay)", border: "1px solid var(--app-border)", borderRadius: 6, boxShadow: "var(--ui-shadow-lg)", zIndex: 200, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--app-border)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <IconButton icon={<XMarkIcon style={{ width: 16, height: 16 }} />} label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </>
  );
}

const dayHeading = {
  margin: "16px 0 6px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--app-muted)",
};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const meetingRow = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  width: "100%",
  padding: "12px 16px",
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};

const meetingDesc = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--app-muted)",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const metaRow = {
  marginTop: 6,
  display: "flex",
  gap: 12,
  fontSize: 12,
  color: "var(--app-muted)",
};
