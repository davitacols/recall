import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const REQUEST_TYPES = [
  { key: "access", name: "Access Request" },
  { key: "bug", name: "Bug Report" },
  { key: "incident", name: "Incident" },
  { key: "service", name: "Service Request" },
  { key: "change", name: "Change Request" },
  { key: "general", name: "General Support" },
];

export default function ServiceDesk() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({
    total_requests: 0,
    open_requests: 0,
    unassigned: 0,
    overdue: 0,
  });
  const [mineOnly, setMineOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "general",
    priority: "medium",
    due_date: "",
  });
  const [error, setError] = useState("");

  const cards = useMemo(
    () => [
      { label: "Total", value: summary.total_requests },
      { label: "Open", value: summary.open_requests },
      { label: "Unassigned", value: summary.unassigned },
      { label: "Overdue", value: summary.overdue },
    ],
    [summary]
  );

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/agile/service-desk/", {
        params: {
          status: statusFilter,
          mine: mineOnly ? 1 : 0,
        },
      });
      setQueue(Array.isArray(response.data?.queue) ? response.data.queue : []);
      setSummary(response.data?.summary || {});
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to load service desk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, mineOnly]);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/agile/service-desk/requests/", form);
      setForm({
        title: "",
        description: "",
        request_type: "general",
        priority: "medium",
        due_date: "",
      });
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={hero}>
        <div>
          <h1 style={{ margin: 0, fontSize: 23 }}>Service Desk</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
            Jira Service Management-style intake and queue for support requests.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={input}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => setMineOnly((v) => !v)} style={mineOnly ? btnActive : btnGhost}>
            {mineOnly ? "Showing Mine" : "Show Mine"}
          </button>
          <button onClick={fetchData} style={btnPrimary}>Refresh</button>
        </div>
      </section>

      <section style={statsGrid}>
        {cards.map((card) => (
          <article key={card.label} style={cardStyle}>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>{card.label}</p>
            <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 20 }}>{card.value || 0}</p>
          </article>
        ))}
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Create Request</h2>
        <form onSubmit={submitRequest} style={{ display: "grid", gap: 8 }}>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Request title"
            style={input}
            required
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the request"
            style={{ ...input, minHeight: 84, resize: "vertical" }}
          />
          <div style={twoCol}>
            <select
              value={form.request_type}
              onChange={(e) => setForm((prev) => ({ ...prev, request_type: e.target.value }))}
              style={input}
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.key} value={type.key}>{type.name}</option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              style={input}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="highest">Highest</option>
            </select>
          </div>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            style={input}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={btnPrimary} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </section>

      <section style={panel}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Queue</h2>
        {loading ? (
          <p style={muted}>Loading queue...</p>
        ) : queue.length === 0 ? (
          <p style={muted}>No requests found for this filter.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {queue.map((item) => (
              <article key={item.id} style={queueRow}>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/issues/${item.id}`} style={{ color: "#111827", fontWeight: 700, textDecoration: "none" }}>
                    {item.key} - {item.title}
                  </Link>
                  <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}>
                    {item.project} | {item.status} | {item.priority} | {item.assignee || "Unassigned"}
                  </p>
                </div>
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {new Date(item.updated_at).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {error ? <p style={{ ...muted, color: "#dc2626" }}>{error}</p> : null}
    </div>
  );
}

const hero = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#ffffff",
  padding: 14,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const panel = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#ffffff",
  padding: 14,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
  gap: 8,
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#ffffff",
  padding: 12,
};

const queueRow = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const input = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

const twoCol = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 8,
};

const btnPrimary = {
  border: "1px solid #111827",
  borderRadius: 8,
  background: "#111827",
  color: "#ffffff",
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  color: "#111827",
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnActive = {
  ...btnGhost,
  border: "1px solid #111827",
  background: "#f3f4f6",
};

const muted = {
  margin: 0,
  color: "#6b7280",
  fontSize: 13,
};
