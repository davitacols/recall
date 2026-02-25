import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import AIAssistant from "../components/AIAssistant";
import ContextPanel from "../components/ContextPanel";

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/meetings/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMeeting(data);
      setFormData(data);
    } catch (error) {
      console.error("Error:", error);
      setMeeting(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/meetings/${id}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      setEditing(false);
      fetchMeeting();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this meeting?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/meetings/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/business/meetings");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center", color: palette.text }}>
        Loading...
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg, display: "grid", placeItems: "center", color: palette.muted }}>
        Meeting not found
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <button onClick={() => navigate("/business/meetings")} style={{ ...ui.secondaryButton, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeftIcon style={{ width: 14, height: 14 }} /> Back
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 10 }}>
          <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
            <AIAssistant content={meeting?.notes} contentType="meeting" />

            {editing ? (
              <form onSubmit={handleUpdate} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <input value={formData.title || ""} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} placeholder="Title" />
                <input type="datetime-local" value={formData.meeting_date || ""} onChange={(event) => setFormData({ ...formData, meeting_date: event.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="number" value={formData.duration_minutes || 0} onChange={(event) => setFormData({ ...formData, duration_minutes: Number(event.target.value) })} style={ui.input} placeholder="Duration" />
                  <input value={formData.location || ""} onChange={(event) => setFormData({ ...formData, location: event.target.value })} style={ui.input} placeholder="Location" />
                </div>
                <textarea rows={8} value={formData.notes || ""} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} style={ui.input} placeholder="Notes" />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" onClick={() => setEditing(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" style={ui.primaryButton}>Save</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: "clamp(1.4rem,2.8vw,2rem)", color: palette.text, letterSpacing: "-0.02em" }}>{meeting.title}</h1>
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: palette.muted }}>{new Date(meeting.meeting_date).toLocaleString()} | {meeting.duration_minutes} min</p>
                    {meeting.location && <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{meeting.location}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditing(true)} style={ui.secondaryButton}>Edit</button>
                    <button onClick={handleDelete} style={{ border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.08)", color: "#ef4444", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}><TrashIcon style={{ width: 14, height: 14 }} /></button>
                  </div>
                </div>

                {meeting.description && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>{meeting.description}</p>
                  </div>
                )}

                {meeting.attendees?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Attendees</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {meeting.attendees.map((attendee) => (
                        <span key={attendee.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 11, color: palette.muted }}>
                          {attendee.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {meeting.notes && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Notes</p>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: palette.muted, lineHeight: 1.6 }}>{meeting.notes}</p>
                  </div>
                )}

                {meeting.action_items?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 13, color: palette.text, fontWeight: 700 }}>Action Items</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {meeting.action_items.map((item) => (
                        <div key={item.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 8, background: palette.cardAlt }}>
                          <p style={{ margin: 0, fontSize: 12, color: palette.text }}>{item.title}</p>
                          {item.assigned_to && <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>Assigned to {item.assigned_to.full_name}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <aside>
            <ContextPanel contentType="business.meeting" objectId={id} />
          </aside>
        </div>
      </div>
    </div>
  );
}
