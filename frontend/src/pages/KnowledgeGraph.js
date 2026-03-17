import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspacePanel,
  WorkspaceToolbar,
} from "../components/WorkspaceChrome";
import { useTheme } from "../utils/ThemeAndAccessibility";
import { getProjectPalette, getProjectUi } from "../utils/projectUi";
import api from "../services/api";

const TYPE_ORDER = ["decision", "conversation", "document", "meeting", "task", "other"];

export default function KnowledgeGraph() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  useEffect(() => {
    fetchGraph();
  }, []);

  useEffect(() => {
    const nodes = graphData.nodes || [];
    if (!nodes.length) {
      setSelectedNodeId(null);
      return;
    }
    if (!selectedNodeId || !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [graphData.nodes, selectedNodeId]);

  const fetchGraph = async () => {
    try {
      const res = await api.get("/api/knowledge/graph/");
      setGraphData(res?.data || { nodes: [], edges: [] });
    } catch (error) {
      console.error("Error:", error);
      setGraphData({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    const colors = {
      conversation: palette.info,
      decision: palette.accent,
      task: palette.success,
      meeting: palette.warn,
      document: darkMode ? "#d9cfbf" : "#6e655b",
      other: darkMode ? "#b7ab9b" : "#8d8176",
    };
    return colors[type] || colors.other;
  };

  const getNodeLabel = (type) => {
    const labels = {
      conversation: "Conversation",
      decision: "Decision",
      task: "Task",
      meeting: "Meeting",
      document: "Document",
      other: "Entity",
    };
    return labels[type] || labels.other;
  };

  const getNodeIcon = (type) => {
    const icons = {
      conversation: ChatBubbleLeftIcon,
      decision: DocumentTextIcon,
      task: ClipboardDocumentListIcon,
      meeting: CalendarIcon,
      document: DocumentTextIcon,
      other: Squares2X2Icon,
    };
    return icons[type] || icons.other;
  };

  const getNodeRoute = (node) => {
    const [type, id] = (node?.id || "").split("_");
    const routes = {
      conversation: `/conversations/${id}`,
      decision: `/decisions/${id}`,
      task: "/business/tasks",
      meeting: `/business/meetings/${id}`,
      document: `/business/documents/${id}`,
    };
    return routes[type] || "/knowledge";
  };

  const positionedNodes = useMemo(() => {
    const width = 1200;
    const height = 720;
    const nodes = graphData.nodes || [];
    if (nodes.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadiusX = 360;
    const outerRadiusY = 220;
    const groups = TYPE_ORDER.map((type) => ({
      type,
      nodes: nodes.filter((node) => (node.type || "other") === type),
    })).filter((group) => group.nodes.length > 0);

    const positions = [];

    groups.forEach((group, groupIndex) => {
      const sectorCenter = (-Math.PI / 2) + (groupIndex / groups.length) * Math.PI * 2;
      const spread = Math.min(Math.PI / 2.8, Math.PI / Math.max(2, group.nodes.length + 0.4));
      const baseX = centerX + outerRadiusX * Math.cos(sectorCenter);
      const baseY = centerY + outerRadiusY * Math.sin(sectorCenter);

      group.nodes.forEach((node, nodeIndex) => {
        const offset = group.nodes.length === 1 ? 0 : (nodeIndex - (group.nodes.length - 1) / 2) * spread;
        const angle = sectorCenter + offset;
        const innerRadius = 44 + (nodeIndex % 3) * 10;

        positions.push({
          ...node,
          x: baseX + innerRadius * Math.cos(angle),
          y: baseY + innerRadius * Math.sin(angle),
        });
      });
    });

    return positions;
  }, [graphData.nodes]);

  const nodeMap = useMemo(
    () =>
      positionedNodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [positionedNodes]
  );

  const selectedNode = selectedNodeId ? nodeMap[selectedNodeId] || null : null;
  const selectedConnections = useMemo(() => {
    if (!selectedNodeId) return [];
    return (graphData.edges || [])
      .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
      .map((edge) => {
        const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
        return {
          ...edge,
          node: nodeMap[otherId],
        };
      })
      .filter((edge) => edge.node);
  }, [graphData.edges, nodeMap, selectedNodeId]);

  const nodeTypeCounts = useMemo(() => {
    return (graphData.nodes || []).reduce((acc, node) => {
      const type = node.type || "other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [graphData.nodes]);

  const typeSummary = TYPE_ORDER.filter((type) => nodeTypeCounts[type]).map((type) => ({
    type,
    count: nodeTypeCounts[type],
  }));

  const edgeDensity = graphData.nodes?.length ? ((graphData.edges?.length || 0) / graphData.nodes.length).toFixed(1) : "0.0";

  const heroStats = [
    {
      label: "Nodes",
      value: graphData.nodes?.length || 0,
      helper: "Linked records visible in the graph",
      tone: palette.accent,
    },
    {
      label: "Connections",
      value: graphData.edges?.length || 0,
      helper: "Relationships drawn between records",
      tone: palette.info,
    },
    {
      label: "Entity Types",
      value: typeSummary.length,
      helper: "Kinds of records represented right now",
      tone: palette.text,
    },
    {
      label: "Density",
      value: edgeDensity,
      helper: "Average connections per visible node",
      tone: palette.success,
    },
  ];

  const graphAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: darkMode
          ? "linear-gradient(160deg, rgba(32,27,23,0.9), rgba(22,18,15,0.82))"
          : "linear-gradient(160deg, rgba(255,252,248,0.96), rgba(244,237,226,0.88))",
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Graph Readout</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>See how context actually clusters.</h3>
      <p style={{ ...asideBody, color: palette.muted }}>
        Use the graph to move between decisions, conversations, meetings, tasks, and documents without losing the trail.
      </p>
      <div style={asideMetricRail}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Types</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{typeSummary.length}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Density</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{edgeDensity}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: 24,
                height: 150,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.76,
                boxShadow: "var(--ui-shadow-sm)",
              }}
            />
          ))}
        </div>
        <div style={{ borderRadius: 26, height: 540, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        eyebrow="Knowledge"
        title="Knowledge Graph"
        description="Explore how conversations, decisions, meetings, documents, and tasks connect so the reasoning behind work stays visible."
        stats={heroStats}
        aside={graphAside}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/knowledge")} style={ui.primaryButton}>
              <MagnifyingGlassIcon style={icon14} /> Open Knowledge Search
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={fetchGraph} style={ui.secondaryButton}>
              <ArrowPathIcon style={icon14} /> Refresh Graph
            </button>
          </>
        }
      />

      <WorkspaceToolbar palette={palette}>
        <div style={toolbarLayout}>
          <div style={toolbarIntro}>
            <p style={{ ...toolbarEyebrow, color: palette.muted }}>Network Legend</p>
            <h2 style={{ ...toolbarTitle, color: palette.text }}>Read the graph at a glance</h2>
            <p style={{ ...toolbarCopy, color: palette.muted }}>
              Colors map to record types. Select a node to inspect its nearby context and jump into the underlying source.
            </p>
          </div>

          <div style={legendRail}>
            {TYPE_ORDER.filter((type) => nodeTypeCounts[type]).map((type) => {
              const Icon = getNodeIcon(type);
              return (
                <span key={type} style={{ ...legendChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                  <span style={{ ...legendDot, background: getNodeColor(type) }} />
                  <Icon style={icon12} />
                  {getNodeLabel(type)} {nodeTypeCounts[type]}
                </span>
              );
            })}
          </div>
        </div>
      </WorkspaceToolbar>

      {positionedNodes.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          title="No graph connections yet"
          description="As conversations, decisions, meetings, tasks, and documents accumulate, the graph will start surfacing how they relate."
          action={
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/knowledge")} style={ui.primaryButton}>
              Go To Knowledge
            </button>
          }
        />
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(300px, 0.9fr)", gap: 14 }}>
          <WorkspacePanel
            palette={palette}
            eyebrow="Network Canvas"
            title="Connected records"
            description="The graph arranges related record types into readable clusters so adjacent context is easier to follow."
            action={
              <span style={{ ...panelStatChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                {graphData.nodes?.length || 0} nodes / {graphData.edges?.length || 0} edges
              </span>
            }
            minHeight={620}
          >
            <div style={graphFrame}>
              <div style={{ overflowX: "auto" }}>
                <svg viewBox="0 0 1200 720" style={{ width: "100%", minWidth: 880, borderRadius: 22 }}>
                  <defs>
                    <pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path d="M 28 0 L 0 0 0 28" fill="none" stroke={darkMode ? "rgba(245,239,230,0.04)" : "rgba(58,47,38,0.05)"} strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="0" y="0" width="1200" height="720" rx="28" fill={darkMode ? "#191411" : "#fbf7f0"} />
                  <rect x="0" y="0" width="1200" height="720" rx="28" fill="url(#graph-grid)" />

                  {(graphData.edges || []).map((edge, index) => {
                    const sourceNode = nodeMap[edge.source];
                    const targetNode = nodeMap[edge.target];
                    if (!sourceNode || !targetNode) return null;

                    const midX = (sourceNode.x + targetNode.x) / 2;
                    const midY = (sourceNode.y + targetNode.y) / 2;
                    const controlY = midY + ((midY > 360 ? 1 : -1) * 36);
                    const isSelected =
                      edge.source === selectedNodeId || edge.target === selectedNodeId;

                    return (
                      <path
                        key={`${edge.source}-${edge.target}-${index}`}
                        d={`M ${sourceNode.x} ${sourceNode.y} Q ${midX} ${controlY} ${targetNode.x} ${targetNode.y}`}
                        fill="none"
                        stroke={isSelected ? palette.accent : darkMode ? "rgba(245,239,230,0.18)" : "rgba(58,47,38,0.14)"}
                        strokeWidth={isSelected ? 2.6 : 1.6}
                        opacity={isSelected ? 0.92 : 0.72}
                      />
                    );
                  })}

                  {positionedNodes.map((node) => {
                    const selected = node.id === selectedNodeId;
                    const nodeColor = getNodeColor(node.type || "other");
                    const label = node.label || getNodeLabel(node.type || "other");
                    return (
                      <g
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {selected ? (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="40"
                            fill="none"
                            stroke={nodeColor}
                            strokeOpacity="0.25"
                            strokeWidth="18"
                          />
                        ) : null}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={selected ? 29 : 24}
                          fill={nodeColor}
                          opacity={selected ? 0.98 : 0.9}
                          stroke={selected ? (darkMode ? "#f5efe6" : "#ffffff") : "none"}
                          strokeWidth={selected ? 4 : 0}
                        />
                        <text
                          x={node.x}
                          y={node.y + 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={darkMode ? "#14110f" : "#fffdf8"}
                          style={{ fontSize: 12, fontWeight: 800 }}
                        >
                          {getNodeLabel(node.type || "other").charAt(0)}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + (selected ? 56 : 48)}
                          textAnchor="middle"
                          fill={darkMode ? "#b7ab9b" : "#6e655b"}
                          style={{ fontSize: 12, fontWeight: selected ? 700 : 600 }}
                        >
                          {label.length > 24 ? `${label.slice(0, 24)}...` : label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            palette={palette}
            eyebrow="Inspector"
            title={selectedNode ? selectedNode.label || getNodeLabel(selectedNode.type || "other") : "Select a node"}
            description={
              selectedNode
                ? `${getNodeLabel(selectedNode.type || "other")} records nearby help explain how this item connects to the rest of the workspace.`
                : "Select a node in the graph to inspect its connected records."
            }
          >
            {selectedNode ? (
              <>
                <div style={inspectorStatGrid}>
                  <div style={{ ...inspectorStat, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                    <p style={{ ...inspectorLabel, color: palette.muted }}>Type</p>
                    <p style={{ ...inspectorValue, color: palette.text }}>{getNodeLabel(selectedNode.type || "other")}</p>
                  </div>
                  <div style={{ ...inspectorStat, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                    <p style={{ ...inspectorLabel, color: palette.muted }}>Connections</p>
                    <p style={{ ...inspectorValue, color: palette.text }}>{selectedConnections.length}</p>
                  </div>
                </div>

                <div style={inspectorButtonRail}>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate(getNodeRoute(selectedNode))} style={ui.primaryButton}>
                    Open record
                  </button>
                  <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/knowledge")} style={ui.secondaryButton}>
                    Knowledge search
                  </button>
                </div>

                <div style={inspectorSection}>
                  <p style={{ ...inspectorSectionLabel, color: palette.muted }}>Connected records</p>
                  <div style={connectionList}>
                    {selectedConnections.length === 0 ? (
                      <div style={{ ...connectionCard, border: `1px dashed ${palette.border}`, background: palette.cardAlt }}>
                        <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
                          No nearby records are attached yet.
                        </p>
                      </div>
                    ) : (
                      selectedConnections.slice(0, 8).map((edge) => (
                        <button
                          key={`${selectedNodeId}-${edge.node.id}`}
                          className="ui-btn-polish ui-focus-ring"
                          onClick={() => setSelectedNodeId(edge.node.id)}
                          style={{ ...connectionCard, border: `1px solid ${palette.border}`, background: palette.cardAlt }}
                        >
                          <span style={{ ...legendDot, background: getNodeColor(edge.node.type || "other") }} />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ ...connectionTitle, color: palette.text }}>
                              {edge.node.label || getNodeLabel(edge.node.type || "other")}
                            </span>
                            <span style={{ ...connectionMeta, color: palette.muted }}>
                              {getNodeLabel(edge.node.type || "other")}
                            </span>
                          </span>
                          <ArrowRightIcon style={{ ...icon12, color: palette.muted, flexShrink: 0 }} />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div style={inspectorSection}>
                  <p style={{ ...inspectorSectionLabel, color: palette.muted }}>Entity mix</p>
                  <div style={typeList}>
                    {typeSummary.map((item) => (
                      <div key={item.type} style={{ ...typeRow, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                        <div style={typeRowMain}>
                          <span style={{ ...legendDot, background: getNodeColor(item.type) }} />
                          <span style={{ color: palette.text }}>{getNodeLabel(item.type)}</span>
                        </div>
                        <span style={{ color: palette.muted }}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <WorkspaceEmptyState
                palette={palette}
                title="Choose a node"
                description="Click a node in the network to inspect related records and open the underlying source."
              />
            )}
          </WorkspacePanel>
        </section>
      )}
    </div>
  );
}

const toolbarLayout = {
  display: "grid",
  gap: 14,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.02,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  maxWidth: 760,
};

const legendRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const legendChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const legendDot = {
  width: 10,
  height: 10,
  borderRadius: 999,
  display: "inline-flex",
  flexShrink: 0,
};

const panelStatChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const graphFrame = {
  borderRadius: 24,
  overflow: "hidden",
};

const asideCard = {
  minWidth: 240,
  borderRadius: 24,
  padding: 16,
  display: "grid",
  gap: 10,
};

const asideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.04,
};

const asideBody = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
};

const asideMetricRail = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const asideMetric = {
  borderRadius: 18,
  padding: "10px 12px",
  display: "grid",
  gap: 3,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
};

const inspectorStatGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const inspectorStat = {
  borderRadius: 18,
  padding: "12px 13px",
  display: "grid",
  gap: 3,
};

const inspectorLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const inspectorValue = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.2,
};

const inspectorButtonRail = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const inspectorSection = {
  display: "grid",
  gap: 8,
};

const inspectorSectionLabel = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const connectionList = {
  display: "grid",
  gap: 8,
};

const connectionCard = {
  borderRadius: 18,
  padding: "12px 13px",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  cursor: "pointer",
};

const connectionTitle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const connectionMeta = {
  display: "block",
  fontSize: 11,
  marginTop: 4,
};

const typeList = {
  display: "grid",
  gap: 8,
};

const typeRow = {
  borderRadius: 16,
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const typeRowMain = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const icon14 = { width: 14, height: 14 };
const icon12 = { width: 12, height: 12 };
