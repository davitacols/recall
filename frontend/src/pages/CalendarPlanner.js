import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

const PROVIDERS = ["manual", "google", "outlook"];

function addDaysISO(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  return dt.toISOString();
}

export default function CalendarPlanner() {
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [tasks, setTasks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [provider, setProvider] = useState("manual");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [windowStart, setWindowStart] = useState(addDaysISO(0));
  const [windowEnd, setWindowEnd] = useState(addDaysISO(7));
  const [result, setResult] = useState(null);
  const [busyRows, setBusyRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [tasksResponse, connResponse] = await Promise.all([
        api.get("/api/business/tasks/"),
        api.get("/api/business/calendar/connections/"),
      ]);
      const taskList = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
      const connList = Array.isArray(connResponse.data) ? connResponse.data : [];
      setTasks(taskList);
      setConnections(connList);
      if (!selectedTaskId && taskList.length > 0) {
        setSelectedTaskId(String(taskList[0].id));
      }
      if (connList.length > 0) {
        setProvider(connList[0].provider || "manual");
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.error || "Failed to load calendar planner data.");
      setTasks([]);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async () => {
    setSavingConnection(true);
    setError("");
    try {
      await api.put("/api/business/calendar/connections/", {
        provider,
        is_connected: true,
      });
      const response = await api.get("/api/business/calendar/connections/");
      setConnections(Array.isArray(response.data) ? response.data : []);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Failed to save calendar connection.");
    } finally {
      setSavingConnection(false);
    }
  };

  const suggestSlot = async () => {
    if (!selectedTaskId) {
      setError("Select a task first.");
      return;
    }
    setError("");
    setResult(null);
    setBusyRows([]);
    try {
      const slotResponse = await api.post("/api/business/calendar/slot-task/", {
        task_id: Number(selectedTaskId),
        duration_minutes: Number(durationMinutes),
        start: windowStart,
        end: windowEnd,
      });
      setResult(slotResponse.data);

      const selectedTask = tasks.find((item) => String(item.id) === String(selectedTaskId));
      const userId = selectedTask?.assigned_to?.id;
      if (userId) {
        const busyResponse = await api.get("/api/business/calendar/free-busy/", {
          params: {
            user_id: userId,
            provider,
            start: windowStart,
            end: windowEnd,
          },
        });
        setBusyRows(Array.isArray(busyResponse.data?.busy) ? busyResponse.data.busy : []);
      }
    } catch (slotError) {
      setError(slotError?.response?.data?.error || "Failed to suggest a calendar slot.");
    }
  };

  const openTasks = tasks.filter((item) => item.status !== "done");

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>TIME ALIGNMENT</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>
            Calendar Planner
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
            Connect a provider, inspect free-busy windows, and auto-suggest task slots.
          </p>
        </section>

        {error ? (
          <div style={{ borderRadius: 12, border: `1px solid ${palette.error}`, background: palette.card, padding: 10, color: palette.error, marginBottom: 10, fontSize: 12 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12, color: palette.muted }}>
            Loading planner...
          </div>
        ) : (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 10 }}>
            <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Connection</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <select value={provider} onChange={(event) => setProvider(event.target.value)} style={ui.input}>
                  {PROVIDERS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={saveConnection} disabled={savingConnection} style={ui.primaryButton}>
                  {savingConnection ? "Saving..." : "Save Connection"}
                </button>
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                  Connected providers: {connections.filter((item) => item.is_connected).map((item) => item.provider).join(", ") || "none"}
                </p>
              </div>
            </article>

            <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Slot Suggestion</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <select value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)} style={ui.input}>
                  <option value="">Select task</option>
                  {openTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  style={ui.input}
                />
                <input type="datetime-local" value={new Date(windowStart).toISOString().slice(0, 16)} onChange={(event) => setWindowStart(new Date(event.target.value).toISOString())} style={ui.input} />
                <input type="datetime-local" value={new Date(windowEnd).toISOString().slice(0, 16)} onChange={(event) => setWindowEnd(new Date(event.target.value).toISOString())} style={ui.input} />
                <button type="button" onClick={suggestSlot} style={ui.primaryButton}>
                  Suggest Slot
                </button>
              </div>
            </article>

            <article style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: palette.text }}>Result</h2>
              {!result ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: palette.muted }}>No suggestion yet.</p>
              ) : result.scheduled ? (
                <div style={{ marginTop: 10, fontSize: 13, color: palette.text }}>
                  <p style={{ margin: "0 0 6px" }}>Task scheduled successfully.</p>
                  <p style={{ margin: 0, color: palette.muted }}>
                    Start: {new Date(result.suggested_slot.start).toLocaleString()}
                  </p>
                  <p style={{ margin: "4px 0 0", color: palette.muted }}>
                    End: {new Date(result.suggested_slot.end).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: palette.muted }}>{result.message || "No slot found."}</p>
              )}

              <h3 style={{ margin: "14px 0 8px", fontSize: 13, color: palette.text }}>Busy windows</h3>
              {busyRows.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No busy entries in selected window.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {busyRows.slice(0, 10).map((row, index) => (
                    <div key={`${row.start}-${index}`} style={{ borderRadius: 10, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 8 }}>
                      <p style={{ margin: 0, fontSize: 12, color: palette.text }}>{new Date(row.start).toLocaleString()} - {new Date(row.end).toLocaleString()}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: palette.muted }}>Source: {row.source || "n/a"}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
