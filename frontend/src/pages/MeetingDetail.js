import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "../components/Toast";
import {
  Avatar,
  Breadcrumb,
  Button,
  Field,
  IconButton,
  Lozenge,
  PageHeader,
  SectionMessage,
} from "../components/atlas";

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast?.() || { success: () => {}, error: () => {} };
  const apiBase = process.env.REACT_APP_API_URL || "";

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", meeting_date: "", duration_minutes: 60, location: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchMeeting = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/business/meetings/${id}/`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load meeting");
      const data = await res.json();
      setMeeting(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        meeting_date: data.meeting_date ? data.meeting_date.slice(0, 16) : "",
        duration_minutes: data.duration_minutes || 60,
        location: data.location || "",
        notes: data.notes || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/business/meetings/${id}/`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update meeting");
      setEditing(false);
      await fetchMeeting();
      toast.success?.("Meeting updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this meeting?")) return;
    try {
      const res = await fetch(`${apiBase}/api/business/meetings/${id}/`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success?.("Meeting deleted");
      navigate("/business/meetings");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: "var(--app-muted)" }}>Loading meeting…</div>;
  }
  if (!meeting) {
    return (
      <div style={{ padding: 32 }}>
        <SectionMessage tone="error" title="Meeting not found">{error || "We couldn't find that meeting."}</SectionMessage>
      </div>
    );
  }

  const isPast = new Date(meeting.meeting_date).getTime() < Date.now();
  const end = new Date(new Date(meeting.meeting_date).getTime() + (meeting.duration_minutes || 60) * 60000);

  return (
    <div style={{ padding: "0 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 24 }}>
        <IconButton icon={<ArrowLeftIcon style={{ width: 16, height: 16 }} />} label="Back" onClick={() => navigate(-1)} />
        <Breadcrumb
          items={[
            { label: "Knoledgr", to: "/" },
            { label: "Meetings", to: "/business/meetings" },
            { label: meeting.title || "Meeting" },
          ]}
        />
      </div>

      <PageHeader
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {meeting.title}
            {isPast ? <Lozenge>Past</Lozenge> : <Lozenge variant="inprogress">Upcoming</Lozenge>}
          </span>
        }
        subtitle={meeting.description || ""}
        actions={
          editing ? (
            <>
              <Button appearance="subtle" onClick={() => setEditing(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSave} isDisabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </>
          ) : (
            <>
              <Button appearance="subtle" iconBefore={<PencilIcon style={{ width: 14, height: 14 }} />} onClick={() => setEditing(true)}>Edit</Button>
              <Button appearance="subtle" iconBefore={<TrashIcon style={{ width: 14, height: 14 }} />} onClick={handleDelete}>Delete</Button>
            </>
          )
        }
        style={{ padding: "0 0 0", marginTop: 12, background: "transparent" }}
      />

      {error ? <SectionMessage tone="error" style={{ marginTop: 16 }}>{error}</SectionMessage> : null}

      <div style={pageGrid}>
        <section style={{ minWidth: 0 }}>
          {editing ? (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20, background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4 }}>
              <Field label="Title" isRequired>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="atlas-input" required />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="atlas-input" rows={3} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="When">
                  <input type="datetime-local" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} className="atlas-input" />
                </Field>
                <Field label="Duration (min)">
                  <input type="number" min="15" step="15" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="atlas-input" />
                </Field>
              </div>
              <Field label="Location / link">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="atlas-input" />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="atlas-input" rows={8} />
              </Field>
            </form>
          ) : (
            <article style={{ background: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 4, padding: 24, minHeight: 240 }}>
              {meeting.notes ? (
                <div className="atlas-article" style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 14, color: "var(--app-text)" }}>
                  {meeting.notes}
                </div>
              ) : (
                <p style={{ margin: 0, color: "var(--app-text-disabled)", fontSize: 14 }}>No notes yet. Click Edit to add meeting notes.</p>
              )}
            </article>
          )}
        </section>

        <aside style={sidePanel}>
          <h3 style={panelTitle}>Details</h3>
          <DetailRow icon={<CalendarIcon style={{ width: 14, height: 14 }} />} label="When" value={formatDateTime(meeting.meeting_date)} />
          <DetailRow icon={<ClockIcon style={{ width: 14, height: 14 }} />} label="Duration" value={`${meeting.duration_minutes || 60} min · ends ${new Date(end).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`} />
          {meeting.location ? <DetailRow icon={<MapPinIcon style={{ width: 14, height: 14 }} />} label="Location" value={meeting.location} /> : null}
          {Array.isArray(meeting.attendees) && meeting.attendees.length ? (
            <div style={{ marginTop: 12 }}>
              <p style={panelTitle}>Attendees</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {meeting.attendees.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Avatar size="sm" name={a.full_name || a.email || ""} />
                    <span>{a.full_name || a.email}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0" }}>
      <span style={{ color: "var(--app-muted)", marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--app-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--app-text)" }}>{value}</p>
      </div>
    </div>
  );
}

const pageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 280px",
  gap: 24,
  marginTop: 16,
};

const sidePanel = {
  background: "var(--app-surface-alt)",
  border: "1px solid var(--app-border)",
  borderRadius: 4,
  padding: 16,
};

const panelTitle = {
  margin: "0 0 8px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--app-muted)",
};
