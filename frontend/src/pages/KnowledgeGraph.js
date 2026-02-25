import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";

export default function KnowledgeGraph() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/graph/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGraphData(await res.json());
    } catch (error) {
      console.error("Error:", error);
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    const colors = {
      conversation: "#60a5fa",
      decision: "#a78bfa",
      task: "#34d399",
      meeting: "#fbbf24",
      document: "#94a3b8",
    };
    return colors[type] || "#94a3b8";
  };

  const handleNodeClick = (node) => {
    const [type, id] = (node.id || "").split("_");
    const routes = {
      conversation: `/conversations/${id}`,
      decision: `/decisions/${id}`,
      task: "/business/tasks",
      meeting: `/business/meetings/${id}`,
      document: `/business/documents/${id}`,
    };
    if (routes[type]) navigate(routes[type]);
  };

  const positionedNodes = useMemo(() => {
    const width = 1100;
    const height = 620;
    const nodes = graphData.nodes || [];
    if (nodes.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 100;

    return nodes.map((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [graphData.nodes]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: palette.bg }}>
        <div style={ui.container}>
          <div style={{ borderRadius: 14, height: 540, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: palette.bg }}>
      <div style={ui.container}>
        <section style={{ borderRadius: 16, border: `1px solid ${palette.border}`, background: palette.card, padding: 16, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: palette.muted }}>KNOWLEDGE GRAPH</p>
          <h1 style={{ margin: "8px 0 4px", fontSize: "clamp(1.5rem,3vw,2.2rem)", color: palette.text, letterSpacing: "-0.02em" }}>Knowledge Graph</h1>
          <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>Explore links between conversations, decisions, tasks, meetings, and docs.</p>
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["conversation", "decision", "task", "meeting", "document"].map((type) => (
            <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: palette.muted }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: getNodeColor(type) }} />
              {type}
            </span>
          ))}
        </section>

        <section style={{ borderRadius: 12, border: `1px solid ${palette.border}`, background: palette.card, padding: 10 }}>
          {positionedNodes.length === 0 ? (
            <div style={{ borderRadius: 10, border: `1px dashed ${palette.border}`, padding: "18px 12px", textAlign: "center", color: palette.muted, fontSize: 13 }}>
              No graph connections yet.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <svg width="100%" height="620" viewBox="0 0 1100 620" style={{ minWidth: 860, borderRadius: 10, border: `1px solid ${palette.border}` }}>
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill={darkMode ? "#57534e" : "#d1d5db"} />
                    </marker>
                  </defs>

                  {(graphData.edges || []).map((edge, index) => {
                    const sourceNode = positionedNodes.find((n) => n.id === edge.source);
                    const targetNode = positionedNodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    return (
                      <line
                        key={index}
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={darkMode ? "#57534e" : "#d1d5db"}
                        strokeWidth="2"
                        opacity="0.65"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}

                  {positionedNodes.map((node) => (
                    <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: "pointer" }}>
                      <circle cx={node.x} cy={node.y} r="30" fill={getNodeColor(node.type)} opacity="0.92" />
                      <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" style={{ fontSize: 12, fontWeight: 700 }}>
                        {(node.type || "?")[0]?.toUpperCase()}
                      </text>
                      <text x={node.x} y={node.y + 46} textAnchor="middle" fill={darkMode ? "#a8a29e" : "#6b7280"} style={{ fontSize: 11 }}>
                        {(node.label || "").length > 22 ? `${node.label.slice(0, 22)}...` : node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <p style={{ margin: "8px 0 0", fontSize: 12, color: palette.muted }}>
                {graphData.nodes?.length || 0} nodes, {graphData.edges?.length || 0} connections
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
