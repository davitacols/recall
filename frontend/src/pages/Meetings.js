import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function Meetings() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", meeting_date: "", duration_minutes: 60, location: "", goal_id: "", conversation_id: "", decision_id: "" });

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/business/meetings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("API Error:", res.status, await res.text());
        setMeetings([]);
        return;
      }
      setMeetings(await res.json());
    } catch (error) {
      console.error("Error fetching meetings:", error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_API_URL}/api/business/meetings/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({ title: "", description: "", meeting_date: "", duration_minutes: 60, location: "", goal_id: "", conversation_id: "", decision_id: "" });
      fetchMeetings();
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  };

  const upcomingCount = meetings.filter((meeting) => new Date(meeting.meeting_date) > new Date()).length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ display: "grid", gap: 8 }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ borderRadius: 12, height: 110, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>MEETING CALENDAR</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Meetings</h1>
            <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Plan and review meeting outcomes with context.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={ui.primaryButton}><PlusIcon style={{ width: 14, height: 14 }} /> New Meeting</button>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
          <Metric label="Total Meetings" value={meetings.length} />
          <Metric label="Upcoming" value={upcomingCount} color="#3b82f6" />
        </section>

        {meetings.length === 0 ? (
          <div style={{ borderRadius: 12, border: `1px dashed ${palette.border}`, background: palette.card, padding: "20px 14px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
            No meetings scheduled yet.
          </div>
        ) : (
          <section style={{ display: "grid", gap: 8 }}>
            {meetings.map((meeting) => (
              <article key={meeting.id} onClick={() => navigate(`/business/meetings/${meeting.id}`)} style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, cursor: "pointer" }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
                  <CalendarIcon style={{ width: 16, height: 16, color: palette.muted, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.text }}>{meeting.title}</p>
                    {meeting.description && <p style={{ margin: "4px 0 0", fontSize: 12, color: palette.muted }}>{meeting.description}</p>}
                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: palette.muted }}>
                      <span>{new Date(meeting.meeting_date).toLocaleString()}</span>
                      <span>{meeting.duration_minutes} min</span>
                      {meeting.location && <span>{meeting.location}</span>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 120, padding: 16 }}>
            <div style={{ width: "min(560px,100%)", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.card, padding: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: palette.text }}>Schedule Meeting</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 12, display: "grid", gap: 8 }}>
                <input required placeholder="Meeting title" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={ui.input} />
                <textarea rows={3} placeholder="Description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={ui.input} />
                <div style={ui.twoCol}>
                  <input type="datetime-local" required value={formData.meeting_date} onChange={(event) => setFormData({ ...formData, meeting_date: event.target.value })} style={ui.input} />
                  <input type="number" value={formData.duration_minutes} onChange={(event) => setFormData({ ...formData, duration_minutes: Number(event.target.value) })} style={ui.input} />
                </div>
                <input placeholder="Location" value={formData.location} onChange={(event) => setFormData({ ...formData, location: event.target.value })} style={ui.input} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={ui.secondaryButton}>Cancel</button>
                  <button type="submit" style={ui.primaryButton}>Schedule</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color = "#f4ece0" }) {
  return (
    <article style={{ borderRadius: 12, padding: 12, border: "1px solid rgba(255,225,193,0.2)", background: "#1f181c" }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#baa892" }}>{label}</p>
    </article>
  );
}
