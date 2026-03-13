import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import { WorkspaceEmptyState, WorkspaceHero, WorkspacePanel } from "../components/WorkspaceChrome";

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
  const [oauthMessage, setOauthMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("calendar_oauth");
    const oauthProvider = params.get("provider");
    if (oauthStatus) {
      if (oauthStatus === "success") {
        setOauthMessage(`Connected ${oauthProvider || "calendar"} successfully.`);
      } else {
        const reason = params.get("reason") || "unknown_error";
        setOauthMessage(`Calendar OAuth failed (${reason}).`);
      }
      const cleanUrl = `${window.location.pathname}`;
      window.history.replaceState({}, "", cleanUrl);
    }
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

  const startOauth = async () => {
    if (!["google", "outlook"].includes(provider)) return;
    setError("");
    try {
      const response = await api.get("/api/business/calendar/oauth/start/", {
        params: {
          provider,
          next: "/business/calendar",
        },
      });
      const authorizeUrl = response.data?.authorize_url;
      if (!authorizeUrl) {
        setError("Failed to generate OAuth URL.");
        return;
      }
      window.location.href = authorizeUrl;
    } catch (oauthError) {
      setError(oauthError?.response?.data?.error || "Failed to start calendar OAuth.");
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
  const connectedProviders = connections.filter((item) => item.is_connected);
  const stats = [
    {
      label: "Open Tasks",
      value: openTasks.length,
      helper: "Available tasks to slot into the calendar",
      tone: palette.info,
    },
    {
      label: "Connected",
      value: connectedProviders.length,
      helper: connectedProviders.map((item) => item.provider).join(", ") || "No providers connected",
      tone: connectedProviders.length ? palette.good : palette.warn,
    },
    {
      label: "Busy Windows",
      value: busyRows.length,
      helper: "Busy intervals in the selected planning window",
      tone: palette.accent,
    },
  ];

  return (
    <div style={{ ...ui.container, display: "grid", gap: 14 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Time Alignment"
        title="Calendar Planner"
        description="Connect a provider, inspect free-busy windows, and auto-suggest task slots."
        stats={stats}
        actions={
          <button onClick={loadData} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
            Refresh planner
          </button>
        }
        aside={<BrandedTechnicalIllustration darkMode={darkMode} compact />}
      />

      {error ? (
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${palette.danger}`,
            background: palette.card,
            padding: 12,
            color: palette.danger,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {oauthMessage ? (
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${palette.border}`,
            background: palette.card,
            padding: 12,
            color: palette.text,
            fontSize: 12,
          }}
        >
          {oauthMessage}
        </div>
      ) : null}

      {loading ? (
        <WorkspacePanel palette={palette} title="Loading planner" description="Pulling tasks, connections, and scheduling context.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ height: 220, borderRadius: 18, border: `1px solid ${palette.border}`, background: palette.cardAlt, opacity: 0.76 }} />
            ))}
          </div>
        </WorkspacePanel>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Connection"
            title="Provider Setup"
            description="Choose a provider and save the connection Knoledgr should use for scheduling."
          >
            <div style={{ display: "grid", gap: 10 }}>
              <select value={provider} onChange={(event) => setProvider(event.target.value)} style={ui.input}>
                {PROVIDERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button type="button" onClick={saveConnection} disabled={savingConnection} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                {savingConnection ? "Saving..." : "Save Connection"}
              </button>
              {["google", "outlook"].includes(provider) ? (
                <button type="button" onClick={startOauth} className="ui-btn-polish ui-focus-ring" style={ui.secondaryButton}>
                  Connect {provider} OAuth
                </button>
              ) : null}
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>
                Connected providers: {connectedProviders.map((item) => item.provider).join(", ") || "none"}
              </p>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Slot Suggestion"
            title="Generate a schedule window"
            description="Choose the task, duration, and planning range to suggest a slot."
          >
            <div style={{ display: "grid", gap: 10 }}>
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
              <input
                type="datetime-local"
                value={new Date(windowStart).toISOString().slice(0, 16)}
                onChange={(event) => setWindowStart(new Date(event.target.value).toISOString())}
                style={ui.input}
              />
              <input
                type="datetime-local"
                value={new Date(windowEnd).toISOString().slice(0, 16)}
                onChange={(event) => setWindowEnd(new Date(event.target.value).toISOString())}
                style={ui.input}
              />
              <button type="button" onClick={suggestSlot} className="ui-btn-polish ui-focus-ring" style={ui.primaryButton}>
                Suggest Slot
              </button>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Result"
            title="Suggested plan"
            description="Review the proposed slot and the busy windows behind it."
          >
            {!result ? (
              <WorkspaceEmptyState
                palette={palette}
                title="No suggestion yet"
                description="Run the planner to generate a schedule suggestion for the selected task."
              />
            ) : result.scheduled ? (
              <div style={{ display: "grid", gap: 6, fontSize: 13, color: palette.text }}>
                <p style={{ margin: 0 }}>Task scheduled successfully.</p>
                <p style={{ margin: 0, color: palette.muted }}>
                  Start: {new Date(result.suggested_slot.start).toLocaleString()}
                </p>
                <p style={{ margin: 0, color: palette.muted }}>
                  End: {new Date(result.suggested_slot.end).toLocaleString()}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>{result.message || "No slot found."}</p>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              <h3 style={{ margin: "4px 0 0", fontSize: 13, color: palette.text }}>Busy windows</h3>
              {busyRows.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: palette.muted }}>No busy entries in the selected window.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {busyRows.slice(0, 10).map((row, index) => (
                    <div key={`${row.start}-${index}`} style={{ borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.cardAlt, padding: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: palette.text }}>
                        {new Date(row.start).toLocaleString()} - {new Date(row.end).toLocaleString()}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: palette.muted }}>Source: {row.source || "n/a"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </WorkspacePanel>
        </section>
      )}
    </div>
  );
}
