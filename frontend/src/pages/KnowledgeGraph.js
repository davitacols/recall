import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { WorkspaceHero, WorkspacePanel, WorkspaceToolbar } from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";
import "./KnowledgeGraph.css";

const TYPE_ORDER = ["decision", "conversation", "goal", "document", "meeting", "task", "other"];

const TYPE_ICON = {
  conversation: ChatBubbleLeftIcon,
  decision: DocumentTextIcon,
  goal: FlagIcon,
  task: ClipboardDocumentListIcon,
  meeting: CalendarIcon,
  document: DocumentTextIcon,
  other: Squares2X2Icon,
};

const TYPE_LABEL = {
  conversation: "Conversation",
  decision: "Decision",
  goal: "Goal",
  task: "Task",
  meeting: "Meeting",
  document: "Document",
  other: "Entity",
};

function nodeRoute(id) {
  const [type, pk] = String(id || "").split("_");
  const routes = {
    conversation: `/conversations/${pk}`,
    decision: `/decisions/${pk}`,
    goal: `/business/goals/${pk}`,
    task: "/business/tasks",
    meeting: `/business/meetings/${pk}`,
    document: `/business/documents/${pk}`,
  };
  return routes[type] || "/knowledge";
}

// Lightweight force-directed layout (no external dependency).
const REPULSION = 4200;
const SPRING = 0.045;
const SPRING_LEN = 96;
const GRAVITY = 0.022;
const DAMP = 0.82;

export default function KnowledgeGraph() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const colorFor = useCallback(
    (type) => ({
      decision: palette.accent,
      conversation: palette.info,
      goal: darkMode ? "#86efac" : "#15803d",
      task: palette.success,
      meeting: palette.warn,
      document: darkMode ? "#cbb89a" : "#8a63d2",
      other: palette.muted,
    }[type] || palette.muted),
    [palette, darkMode]
  );

  const [graphData, setGraphData] = useState({ nodes: [], edges: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTypes, setActiveTypes] = useState(() => {
    const raw = searchParams.get("types");
    return raw ? raw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  });
  const [includeIsolated, setIncludeIsolated] = useState(searchParams.get("include_isolated") !== "false");

  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const posRef = useRef(new Map());
  const simRef = useRef({ alpha: 0, raf: 0 });
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  const [, setFrame] = useState(0);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });

  // ---- data fetch (unchanged contract) ----
  const fetchGraph = useCallback(async (src) => {
    setLoading(true);
    try {
      const params = {};
      ["q", "types", "focus_type", "focus_id", "include_isolated"].forEach((key) => {
        const v = src.get(key);
        if (v) params[key] = v;
      });
      const { data } = await api.get("/api/knowledge/graph/", { params });
      setGraphData(data || { nodes: [], edges: [], summary: {} });
    } catch (e) {
      setGraphData({ nodes: [], edges: [], summary: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setActiveTypes((searchParams.get("types") || "").split(",").map((t) => t.trim()).filter(Boolean));
    setIncludeIsolated(searchParams.get("include_isolated") !== "false");
    fetchGraph(searchParams);
  }, [searchParams, fetchGraph]);

  // ---- size tracking ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(320, r.width), h: 640 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  const { degree, adjacency } = useMemo(() => {
    const deg = {};
    const adj = {};
    nodes.forEach((n) => { deg[n.id] = 0; adj[n.id] = new Set(); });
    edges.forEach((e) => {
      if (deg[e.source] != null) deg[e.source] += 1;
      if (deg[e.target] != null) deg[e.target] += 1;
      if (adj[e.source]) adj[e.source].add(e.target);
      if (adj[e.target]) adj[e.target].add(e.source);
    });
    return { degree: deg, adjacency: adj };
  }, [nodes, edges]);

  const radiusFor = useCallback((id) => 8 + Math.min(13, (degree[id] || 0) * 1.6), [degree]);

  // ---- (re)seed positions when the node set changes ----
  useEffect(() => {
    const pos = posRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const live = new Set(nodes.map((n) => n.id));
    [...pos.keys()].forEach((id) => { if (!live.has(id)) pos.delete(id); });
    const focus = graphData.summary?.focus_node;
    nodes.forEach((n, i) => {
      if (!pos.has(n.id)) {
        if (n.id === focus) {
          pos.set(n.id, { x: cx, y: cy, vx: 0, vy: 0 });
        } else {
          const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
          const r = 120 + (i % 5) * 60;
          pos.set(n.id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 });
        }
      }
    });
    simRef.current.alpha = 1;
    startSim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, size.w, size.h]);

  const tick = useCallback(() => {
    const pos = posRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const sim = simRef.current;
    const list = nodes;
    const f = {};
    list.forEach((n) => { f[n.id] = { x: 0, y: 0 }; });

    for (let i = 0; i < list.length; i += 1) {
      const a = pos.get(list[i].id);
      if (!a) continue;
      f[list[i].id].x += (cx - a.x) * GRAVITY;
      f[list[i].id].y += (cy - a.y) * GRAVITY;
      for (let j = i + 1; j < list.length; j += 1) {
        const b = pos.get(list[j].id);
        if (!b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = Math.random(); dy = Math.random(); d2 = 1; }
        if (d2 > 360000) continue; // cull far pairs
        const rep = REPULSION / d2;
        f[list[i].id].x += dx * rep;
        f[list[i].id].y += dy * rep;
        f[list[j].id].x -= dx * rep;
        f[list[j].id].y -= dy * rep;
      }
    }

    edges.forEach((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b || !f[e.source] || !f[e.target]) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = SPRING * (dist - SPRING_LEN);
      const ux = (dx / dist) * force;
      const uy = (dy / dist) * force;
      f[e.source].x += ux; f[e.source].y += uy;
      f[e.target].x -= ux; f[e.target].y -= uy;
    });

    const drag = dragRef.current;
    list.forEach((n) => {
      const p = pos.get(n.id);
      if (!p || (drag && drag.id === n.id)) return;
      p.vx = (p.vx + f[n.id].x) * DAMP;
      p.vy = (p.vy + f[n.id].y) * DAMP;
      p.x += p.vx * sim.alpha;
      p.y += p.vy * sim.alpha;
    });

    sim.alpha *= 0.985;
    setFrame((v) => (v + 1) % 1000000);
    if (sim.alpha > 0.02) {
      sim.raf = requestAnimationFrame(tick);
    } else {
      sim.raf = 0;
    }
  }, [nodes, edges, size.w, size.h]);

  const startSim = useCallback(() => {
    const sim = simRef.current;
    if (sim.raf) return;
    sim.raf = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => { if (simRef.current.raf) cancelAnimationFrame(simRef.current.raf); }, []);

  const reheat = (a = 0.5) => {
    simRef.current.alpha = Math.max(simRef.current.alpha, a);
    startSim();
  };

  // ---- selection ----
  useEffect(() => {
    if (!nodes.length) { setSelectedId(null); return; }
    const focus = graphData.summary?.focus_node;
    if (focus && nodes.some((n) => n.id === focus)) { setSelectedId(focus); return; }
    setSelectedId((prev) => (prev && nodes.some((n) => n.id === prev) ? prev : (nodes.find((n) => n.matched) || nodes[0]).id));
  }, [nodes, graphData.summary]);

  // ---- pointer / pan / zoom ----
  const toLogical = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = size.w / rect.width;
    const sx = (clientX - rect.left) * ratio;
    const sy = (clientY - rect.top) * ratio;
    const v = viewRef.current;
    return { x: (sx - v.x) / v.k, y: (sy - v.y) / v.k };
  };

  const onNodePointerDown = (e, id) => {
    e.stopPropagation();
    svgRef.current.setPointerCapture?.(e.pointerId);
    const lp = toLogical(e.clientX, e.clientY);
    dragRef.current = { id, moved: false, startX: e.clientX, startY: e.clientY, offX: 0, offY: 0, mode: "node" };
    const p = posRef.current.get(id);
    if (p) { dragRef.current.offX = lp.x - p.x; dragRef.current.offY = lp.y - p.y; }
  };

  const onBgPointerDown = (e) => {
    svgRef.current.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode: "pan", moved: false, startX: e.clientX, startY: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 3) d.moved = true;
    if (d.mode === "node") {
      const lp = toLogical(e.clientX, e.clientY);
      const p = posRef.current.get(d.id);
      if (p) { p.x = lp.x - d.offX; p.y = lp.y - d.offY; p.vx = 0; p.vy = 0; }
      reheat(0.35);
    } else if (d.mode === "pan") {
      const rect = svgRef.current.getBoundingClientRect();
      const ratio = size.w / rect.width;
      const nv = { ...viewRef.current, x: d.vx + (e.clientX - d.startX) * ratio, y: d.vy + (e.clientY - d.startY) * ratio };
      viewRef.current = nv;
      setView(nv);
    }
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.mode === "node" && !d.moved) setSelectedId(d.id);
    if (d.mode === "node") reheat(0.2);
    svgRef.current.releasePointerCapture?.(e.pointerId);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = size.w / rect.width;
    const sx = (e.clientX - rect.left) * ratio;
    const sy = (e.clientY - rect.top) * ratio;
    const v = viewRef.current;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const k = Math.min(2.6, Math.max(0.3, v.k * factor));
    const nv = { k, x: sx - (sx - v.x) * (k / v.k), y: sy - (sy - v.y) * (k / v.k) };
    viewRef.current = nv;
    setView(nv);
  };

  const zoomBy = (factor) => {
    const v = viewRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const k = Math.min(2.6, Math.max(0.3, v.k * factor));
    const nv = { k, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k) };
    viewRef.current = nv;
    setView(nv);
  };

  const resetView = () => {
    const nv = { x: 0, y: 0, k: 1 };
    viewRef.current = nv;
    setView(nv);
    reheat(0.6);
  };

  // ---- filters ----
  const commit = (next) => setSearchParams(next);
  const applyFilters = () => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (activeTypes.length) next.set("types", activeTypes.join(","));
    if (!includeIsolated) next.set("include_isolated", "false");
    commit(next);
  };
  const toggleType = (type) => {
    const set = new Set(activeTypes);
    if (set.has(type)) set.delete(type); else set.add(type);
    const arr = [...set];
    setActiveTypes(arr);
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (arr.length) next.set("types", arr.join(","));
    if (!includeIsolated) next.set("include_isolated", "false");
    commit(next);
  };
  const reset = () => { setQuery(""); setActiveTypes([]); setIncludeIsolated(true); commit(new URLSearchParams()); };
  const focusHere = (id) => {
    const [ft, fi] = String(id || "").split("_");
    if (!ft || !fi) return;
    const next = new URLSearchParams(searchParams);
    next.set("focus_type", ft);
    next.set("focus_id", fi);
    commit(next);
  };

  const presentTypes = useMemo(() => {
    const set = new Set(nodes.map((n) => n.type || "other"));
    return TYPE_ORDER.filter((t) => set.has(t));
  }, [nodes]);

  const selected = nodes.find((n) => n.id === selectedId) || null;
  const neighborIds = selected ? adjacency[selected.id] || new Set() : new Set();
  const showAllLabels = nodes.length <= 30;

  // ---- shared inline styles from palette ----
  const card = { background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 16, boxShadow: "var(--ui-shadow-sm)" };
  const inputStyle = { ...ui.input, background: palette.cardAlt, color: palette.text };

  return (
    <div style={{ ...ui.container, display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Knowledge"
        title="Knowledge graph"
        description="See how conversations, decisions, goals, meetings, documents, and tasks connect. Drag to explore, scroll to zoom, click a node to trace its links."
        stats={[
          { label: "Nodes", value: `${nodes.length}`, helper: "Records in view" },
          { label: "Connections", value: `${edges.length}`, helper: "Links between records" },
          { label: "Types", value: `${presentTypes.length}`, helper: "Record kinds present" },
        ]}
        actions={
          <button className="ui-btn-polish ui-focus-ring" onClick={() => fetchGraph(searchParams)} style={ui.secondaryButton}>
            <ArrowPathIcon style={{ width: 14, height: 14 }} /> Refresh
          </button>
        }
      />

      <WorkspaceToolbar palette={palette} darkMode={darkMode} variant="memory">
        <div className="kg-toolbar">
          <div className="kg-search">
            <MagnifyingGlassIcon style={{ color: palette.muted }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              placeholder="Search the graph…"
              style={inputStyle}
            />
          </div>
          <div className="kg-chips">
            {TYPE_ORDER.map((type) => {
              const on = activeTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className="kg-chip"
                  onClick={() => toggleType(type)}
                  style={{
                    background: on ? palette.accentSoft : palette.card,
                    borderColor: on ? palette.accent : palette.border,
                    color: on ? palette.accent : palette.muted,
                  }}
                >
                  <span className="kg-chip-dot" style={{ background: colorFor(type) }} />
                  {TYPE_LABEL[type]}
                </button>
              );
            })}
          </div>
          <span style={{ flex: 1 }} />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: palette.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeIsolated}
              onChange={(e) => { setIncludeIsolated(e.target.checked); const next = new URLSearchParams(searchParams); if (e.target.checked) next.delete("include_isolated"); else next.set("include_isolated", "false"); commit(next); }}
            />
            Show unlinked
          </label>
          <button className="ui-btn-polish ui-focus-ring" onClick={reset} style={ui.secondaryButton}>Reset</button>
        </div>
      </WorkspaceToolbar>

      <div className="kg-layout">
        <div className="kg-canvas-wrap" ref={wrapRef} style={{ ...card, background: palette.cardAlt }}>
          {!loading && nodes.length === 0 ? (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
              <div>
                <Squares2X2Icon style={{ width: 40, height: 40, color: palette.muted, margin: "0 auto 12px" }} />
                <p style={{ color: palette.text, fontWeight: 600, margin: 0 }}>Nothing to graph yet</p>
                <p style={{ color: palette.muted, fontSize: 13, marginTop: 6, maxWidth: 320 }}>
                  As conversations, decisions, and records accumulate and link together, they'll appear here.
                </p>
              </div>
            </div>
          ) : null}

          {/* Legend */}
          <div className="kg-legend">
            {presentTypes.map((t) => (
              <span key={t} className="kg-legend-item" style={{ color: palette.muted }}>
                <span className="kg-legend-dot" style={{ background: colorFor(t) }} />
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>

          <svg
            ref={svgRef}
            className={`kg-canvas ${dragRef.current?.mode === "pan" ? "is-panning" : ""}`}
            viewBox={`0 0 ${size.w} ${size.h}`}
            onPointerDown={onBgPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          >
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {/* edges */}
              {edges.map((e, i) => {
                const a = posRef.current.get(e.source);
                const b = posRef.current.get(e.target);
                if (!a || !b) return null;
                const related = !selected || e.source === selected.id || e.target === selected.id;
                return (
                  <line
                    key={i}
                    className="kg-edge"
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={palette.border}
                    strokeWidth={related ? 1.6 : 1}
                    strokeOpacity={selected ? (related ? 0.9 : 0.12) : 0.5}
                  />
                );
              })}
              {/* nodes */}
              {nodes.map((n) => {
                const p = posRef.current.get(n.id);
                if (!p) return null;
                const r = radiusFor(n.id);
                const isSel = selected && n.id === selected.id;
                const isNeighbor = selected && neighborIds.has(n.id);
                const dim = selected && !isSel && !isNeighbor;
                const c = colorFor(n.type || "other");
                const showLabel = showAllLabels || isSel || isNeighbor || hoverId === n.id;
                return (
                  <g
                    key={n.id}
                    className="kg-node"
                    transform={`translate(${p.x},${p.y})`}
                    opacity={dim ? 0.32 : 1}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onPointerEnter={() => setHoverId(n.id)}
                    onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
                  >
                    <circle
                      className="kg-node-ring"
                      r={r}
                      fill={c}
                      stroke={isSel ? palette.text : palette.card}
                      strokeWidth={isSel ? 3 : 2}
                    />
                    {showLabel ? (
                      <text
                        className="kg-node-label"
                        x={0}
                        y={r + 13}
                        textAnchor="middle"
                        fill={palette.text}
                        stroke={palette.cardAlt}
                        strokeWidth={3}
                      >
                        {(n.label || "Untitled").slice(0, 26)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* zoom controls */}
          <div className="kg-controls">
            <button className="kg-ctl" onClick={() => zoomBy(1.2)} aria-label="Zoom in" style={{ background: palette.card, borderColor: palette.border, color: palette.text }}><PlusIcon /></button>
            <button className="kg-ctl" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out" style={{ background: palette.card, borderColor: palette.border, color: palette.text }}><MinusIcon /></button>
            <button className="kg-ctl" onClick={resetView} aria-label="Reset view" style={{ background: palette.card, borderColor: palette.border, color: palette.text }}><ArrowsPointingOutIcon /></button>
          </div>
        </div>

        {/* details panel */}
        <WorkspacePanel palette={palette} darkMode={darkMode} variant="memory" eyebrow="Inspector" title={selected ? "Selected record" : "No selection"}>
          {!selected ? (
            <p className="kg-panel-empty" style={{ color: palette.muted }}>
              Click a node to see what it connects to.
            </p>
          ) : (
            <div className="kg-panel">
              {(() => {
                const Icon = TYPE_ICON[selected.type] || Squares2X2Icon;
                const c = colorFor(selected.type || "other");
                return (
                  <>
                    <span className="kg-detail-type" style={{ background: palette.accentSoft, color: c }}>
                      <Icon /> {TYPE_LABEL[selected.type] || "Entity"}
                    </span>
                    <div className="kg-detail-title" style={{ color: palette.text }}>{selected.label || "Untitled"}</div>
                    <div className="kg-detail-stat" style={{ color: palette.muted }}>
                      <b style={{ color: palette.text }}>{degree[selected.id] || 0}</b> connection{(degree[selected.id] || 0) === 1 ? "" : "s"}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(nodeRoute(selected.id))} style={{ ...ui.primaryButton, justifyContent: "center" }}>
                        Open record <ArrowRightIcon style={{ width: 14, height: 14 }} />
                      </button>
                      <button className="ui-btn-polish ui-focus-ring" onClick={() => focusHere(selected.id)} style={ui.secondaryButton}>
                        Focus
                      </button>
                    </div>

                    {neighborIds.size ? (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: palette.muted, margin: "4px 0 6px" }}>
                          Connected to
                        </p>
                        <div className="kg-neighbors">
                          {[...neighborIds].slice(0, 12).map((nid) => {
                            const nn = nodes.find((x) => x.id === nid);
                            if (!nn) return null;
                            return (
                              <button key={nid} type="button" className="kg-neighbor" onClick={() => setSelectedId(nid)} style={{ color: palette.text }}>
                                <span className="kg-neighbor-dot" style={{ background: colorFor(nn.type || "other") }} />
                                <span>{nn.label || "Untitled"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: palette.muted }}>No links yet — this record stands alone.</p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
