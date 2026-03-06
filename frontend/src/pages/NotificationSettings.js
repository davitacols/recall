import React, { useEffect, useMemo, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { useToast } from "../components/Toast";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

const DIGEST_OPTIONS = [
  { value: "realtime", label: "Real-time", desc: "Instant updates as they happen." },
  { value: "hourly", label: "Hourly", desc: "A compact summary every hour." },
  { value: "daily", label: "Daily", desc: "One summary each day." },
  { value: "weekly", label: "Weekly", desc: "A weekly roundup." },
  { value: "never", label: "Never", desc: "Disable digest emails." },
];

const CHANNEL_TOGGLES = [
  { key: "email_notifications", title: "Enable Email Notifications", desc: "Receive updates in your inbox." },
  { key: "mention_notifications", title: "Mentions", desc: "When someone mentions you." },
  { key: "reply_notifications", title: "Replies", desc: "When someone replies to your threads." },
  { key: "decision_notifications", title: "Decisions", desc: "Changes to decisions involving you." },
  { key: "task_notifications", title: "Tasks", desc: "Task assignments and due date changes." },
  { key: "goal_notifications", title: "Goals", desc: "Goal assignments and status updates." },
  { key: "meeting_notifications", title: "Meetings", desc: "Meeting invites and schedule updates." },
];

export default function NotificationSettings() {
  const { darkMode } = useTheme();
  const { success, error } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    email_notifications: true,
    mention_notifications: true,
    reply_notifications: true,
    decision_notifications: true,
    task_notifications: true,
    goal_notifications: true,
    meeting_notifications: true,
    digest_frequency: "daily",
  });
  const [loading, setLoading] = useState(true);
  const [busyField, setBusyField] = useState("");
  const [busyDigest, setBusyDigest] = useState(false);
  const [sendingTest, setSendingTest] = useState("");

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: "#0f0b0d",
            panel: "#171215",
            panelSoft: "#1d171b",
            border: "rgba(255,225,193,0.14)",
            text: "#f4ece0",
            muted: "#baa892",
            accent: "#ffb476",
            accentText: "#20120d",
            chipActive: "rgba(255,180,118,0.16)",
          }
        : {
            bg: "#f6f1ea",
            panel: "#fffaf3",
            panelSoft: "#ffffff",
            border: "#eadfce",
            text: "#231814",
            muted: "#7d6d5a",
            accent: "#d9692e",
            accentText: "#fff7ee",
            chipActive: "rgba(217,105,46,0.11)",
          },
    [darkMode]
  );

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/organizations/settings/notifications/");
      setSettings((prev) => ({ ...prev, ...(res.data || {}) }));
    } catch (err) {
      error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field) => {
    const prev = settings;
    const nextSettings = { ...settings, [field]: !settings[field] };
    setSettings(nextSettings);
    setBusyField(field);
    try {
      await api.put("/api/organizations/settings/notifications/", nextSettings);
      success("Settings updated");
    } catch (err) {
      error("Failed to update settings");
      setSettings(prev);
    } finally {
      setBusyField("");
    }
  };

  const handleFrequencyChange = async (frequency) => {
    const prev = settings;
    const nextSettings = { ...settings, digest_frequency: frequency };
    setSettings(nextSettings);
    setBusyDigest(true);
    try {
      await api.put("/api/organizations/settings/notifications/", nextSettings);
      success("Digest frequency updated");
    } catch (err) {
      error("Failed to update digest frequency");
      setSettings(prev);
    } finally {
      setBusyDigest(false);
    }
  };

  const handleSendTestNotification = async () => {
    setSendingTest("inapp");
    try {
      await api.post("/api/notifications/test/");
      success("Test in-app notification sent");
    } catch (err) {
      error(err?.response?.data?.error || "Failed to send test notification");
    } finally {
      setSendingTest("");
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest("email");
    try {
      await api.post("/api/notifications/test-email/");
      success("Test email sent");
    } catch (err) {
      error(err?.response?.data?.error || "Failed to send test email");
    } finally {
      setSendingTest("");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: "20px" }}>
        <div style={{ color: palette.text }}>Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={container}>
        <header style={{ ...hero, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BellIcon style={{ width: 22, height: 22, color: palette.text }} />
            <div>
              <h1 style={{ margin: 0, color: palette.text, fontSize: "clamp(1.2rem,2vw,1.6rem)" }}>Notification Settings</h1>
              <p style={{ margin: "5px 0 0", color: palette.muted, fontSize: 13 }}>
                Manage channels, digest cadence, and diagnostics.
              </p>
            </div>
          </div>
        </header>

        <section style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <h2 style={{ ...panelTitle, color: palette.text }}>Channels</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {CHANNEL_TOGGLES.map((item) => (
              <div key={item.key} style={{ ...settingRow, background: palette.panelSoft, border: `1px solid ${palette.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, color: palette.text, fontWeight: 700, fontSize: 14 }}>{item.title}</p>
                  <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12 }}>{item.desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={busyField === item.key}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...toggleWrap,
                    background: settings[item.key] ? palette.accent : darkMode ? "#3f352f" : "#ddd2c3",
                    opacity: busyField === item.key ? 0.65 : 1,
                    cursor: busyField === item.key ? "not-allowed" : "pointer",
                  }}
                  aria-label={`Toggle ${item.title}`}
                >
                  <span style={{ ...toggleKnob, transform: settings[item.key] ? "translateX(18px)" : "translateX(0)" }} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <h2 style={{ ...panelTitle, color: palette.text }}>Digest Frequency</h2>
          <p style={{ margin: "0 0 8px", color: palette.muted, fontSize: 12 }}>
            Choose how often you receive summary emails.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {DIGEST_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFrequencyChange(option.value)}
                disabled={busyDigest}
                className="ui-btn-polish ui-focus-ring"
                style={{
                  ...digestRow,
                  border: `1px solid ${palette.border}`,
                  background: settings.digest_frequency === option.value ? palette.chipActive : palette.panelSoft,
                  opacity: busyDigest ? 0.8 : 1,
                  cursor: busyDigest ? "not-allowed" : "pointer",
                }}
              >
                <p style={{ margin: 0, color: palette.text, fontSize: 14, fontWeight: 700 }}>{option.label}</p>
                <p style={{ margin: "4px 0 0", color: palette.muted, fontSize: 12 }}>{option.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...panel, background: palette.panel, border: `1px solid ${palette.border}` }}>
          <h2 style={{ ...panelTitle, color: palette.text }}>Diagnostics</h2>
          <p style={{ margin: "0 0 10px", color: palette.muted, fontSize: 12 }}>
            Validate delivery quickly from this workspace.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={handleSendTestNotification}
              disabled={sendingTest === "inapp"}
              className="ui-btn-polish ui-focus-ring"
              style={{
                ...diagButton,
                border: `1px solid ${palette.border}`,
                background: palette.panelSoft,
                color: palette.text,
                opacity: sendingTest === "inapp" ? 0.7 : 1,
              }}
            >
              {sendingTest === "inapp" ? "Sending..." : "Send Test In-App"}
            </button>
            {user?.role === "admin" ? (
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTest === "email"}
                className="ui-btn-polish ui-focus-ring"
                style={{
                  ...diagButton,
                  border: `1px solid ${darkMode ? "rgba(255,180,118,0.5)" : "#b95322"}`,
                  background: palette.accent,
                  color: palette.accentText,
                  opacity: sendingTest === "email" ? 0.7 : 1,
                }}
              >
                {sendingTest === "email" ? "Sending..." : "Send Test Email"}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

const container = {
  width: "min(1100px, 100%)",
  margin: "0 auto",
  padding: "clamp(12px,2.2vw,24px)",
  display: "grid",
  gap: 12,
};

const hero = {
  borderRadius: 16,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const panel = {
  borderRadius: 14,
  padding: "14px",
  display: "grid",
  gap: 10,
};

const panelTitle = {
  margin: 0,
  fontSize: 18,
};

const settingRow = {
  borderRadius: 12,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const toggleWrap = {
  width: 42,
  height: 24,
  borderRadius: 999,
  border: "none",
  padding: 3,
  display: "flex",
  alignItems: "center",
  transition: "background-color 0.15s ease",
};

const toggleKnob = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#fff",
  transition: "transform 0.15s ease",
};

const digestRow = {
  borderRadius: 11,
  padding: "10px 11px",
  textAlign: "left",
};

const diagButton = {
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

