import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import BrandedTechnicalIllustration from "../components/BrandedTechnicalIllustration";
import api from "../services/api";

function Messages() {
  const { userId } = useParams();
  const { darkMode } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(userId ? parseInt(userId, 10) : null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedUser) return undefined;
    fetchMessages(selectedUser);
    const interval = setInterval(() => fetchMessages(selectedUser), 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const response = await api.get("/api/notifications/messages/");
      setConversations(response.data || []);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (targetUserId) => {
    try {
      const response = await api.get(`/api/notifications/messages/${targetUserId}/`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    setSending(true);
    try {
      await api.post("/api/notifications/messages/", {
        recipient_id: selectedUser,
        content: newMessage,
      });
      setNewMessage("");
      await fetchMessages(selectedUser);
      await fetchConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...ui.container, display: "grid", placeItems: "center", minHeight: 360 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${palette.border}`, borderTopColor: palette.accent }} />
      </div>
    );
  }

  return (
    <div style={{ ...ui.container, display: "grid", gap: 12, fontFamily: "'Sora', 'Space Grotesk', 'Segoe UI', sans-serif" }}>
      <section
        style={{
          border: `1px solid ${palette.border}`,
          borderRadius: 16,
          padding: "clamp(16px,2.4vw,24px)",
          background: `linear-gradient(140deg, ${palette.accentSoft}, ${darkMode ? "rgba(31,143,102,0.12)" : "rgba(187,247,208,0.42)"})`,
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          alignItems: "end",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: palette.muted }}>TEAM MESSAGING</p>
          <h1 style={{ margin: 0, fontSize: "clamp(1.12rem,2.1vw,1.58rem)", color: palette.text }}>Messages</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Direct communication with your teammates in one place.</p>
        </div>
        <BrandedTechnicalIllustration darkMode={darkMode} compact />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,300px) minmax(0,1fr)",
          gap: 10,
          minHeight: "min(70vh, 620px)",
        }}
      >
        <aside style={{ border: `1px solid ${palette.border}`, borderRadius: 12, overflow: "hidden", background: palette.card }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700 }}>Conversations</div>
          {conversations.length === 0 ? (
            <div style={{ padding: 12, color: palette.muted, fontSize: 13 }}>No conversations</div>
          ) : (
            conversations.map((conv) => {
              const selected = selectedUser === conv.user_id;
              return (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedUser(conv.user_id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    border: "none",
                    borderBottom: `1px solid ${palette.border}`,
                    background: selected ? palette.accentSoft : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: palette.text, fontWeight: 700, fontSize: 13 }}>{conv.user_name}</div>
                  <div style={{ color: palette.muted, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.last_message}</div>
                  {conv.unread_count > 0 ? <div style={{ color: palette.danger, fontSize: 11, fontWeight: 700, marginTop: 4 }}>{conv.unread_count} unread</div> : null}
                </button>
              );
            })
          )}
        </aside>

        <main style={{ border: `1px solid ${palette.border}`, borderRadius: 12, overflow: "hidden", background: palette.card, display: "grid", gridTemplateRows: "auto 1fr auto" }}>
          {selectedUser ? (
            <>
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700 }}>
                {conversations.find((c) => c.user_id === selectedUser)?.user_name || "Conversation"}
              </div>
              <div style={{ overflowY: "auto", padding: 12, display: "grid", gap: 8 }}>
                {messages.map((msg) => {
                  const incoming = msg.sender_id === selectedUser;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: incoming ? "flex-start" : "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "72%",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: incoming ? palette.cardAlt : palette.accentSoft,
                          color: palette.text,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13 }}>{msg.content}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 11, color: palette.muted }}>{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSendMessage} style={{ borderTop: `1px solid ${palette.border}`, padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Type a message..."
                  style={ui.input}
                />
                <button type="submit" disabled={sending || !newMessage.trim()} style={{ ...ui.primaryButton, opacity: sending || !newMessage.trim() ? 0.55 : 1 }}>
                  <PaperAirplaneIcon style={{ width: 16, height: 16 }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: "grid", placeItems: "center", color: palette.muted, minHeight: 260 }}>
              Select a conversation to start messaging.
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

export default Messages;
