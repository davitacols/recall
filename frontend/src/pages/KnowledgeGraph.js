import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  XMarkIcon,
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

const TYPE_ORDER = ["decision", "conversation", "goal", "document", "meeting", "task", "other"];
const GRAPH_WIDTH = 1180;
const GRAPH_HEIGHT = 660;
const GRAPH_MARGIN_X = 72;
const GRAPH_MARGIN_Y = 56;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function typeSortIndex(type) {
  const index = TYPE_ORDER.indexOf(type || "other");
  return index === -1 ? TYPE_ORDER.length : index;
}

function polarPosition(centerX, centerY, radiusX, radiusY, angle) {
  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  };
}

function getNodeLabelPlacement(node, centerX, centerY) {
  if (!node) {
    return { x: centerX, y: centerY, anchor: "middle" };
  }

  const dx = node.x - centerX;
  const dy = node.y - centerY;

  if (node.ring === "hub") {
    return { x: node.x, y: node.y + 58, anchor: "middle" };
  }

  if (Math.abs(dx) < 84) {
    return {
      x: node.x,
      y: node.y + (dy < 0 ? -34 : 36),
      anchor: "middle",
    };
  }

  return dx > 0
    ? { x: node.x + 30, y: node.y + 4, anchor: "start" }
    : { x: node.x - 30, y: node.y + 4, anchor: "end" };
}

export default function KnowledgeGraph() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { darkMode } = useTheme();
  const palette = useMemo(() => getProjectPalette(darkMode), [darkMode]);
  const ui = useMemo(() => getProjectUi(palette), [palette]);

  const [graphData, setGraphData] = useState({ nodes: [], edges: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [graphQuery, setGraphQuery] = useState(searchParams.get("q") || "");
  const [activeTypes, setActiveTypes] = useState(() => {
    const raw = searchParams.get("types");
    return raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
  });
  const [includeIsolated, setIncludeIsolated] = useState(searchParams.get("include_isolated") !== "false");
  const [isWideLayout, setIsWideLayout] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1180
  );

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextTypes = (searchParams.get("types") || "").split(",").map((item) => item.trim()).filter(Boolean);
    setGraphQuery(nextQuery);
    setActiveTypes(nextTypes);
    setIncludeIsolated(searchParams.get("include_isolated") !== "false");
    fetchGraph(searchParams);
  }, [searchParams]);

  useEffect(() => {
    const nodes = graphData.nodes || [];
    if (!nodes.length) {
      setSelectedNodeId(null);
      return;
    }
    const focusedNode = graphData.summary?.focus_node;
    if (focusedNode && nodes.some((node) => node.id === focusedNode)) {
      setSelectedNodeId(focusedNode);
      return;
    }
    if (!selectedNodeId || !nodes.some((node) => node.id === selectedNodeId)) {
      const matchedNode = nodes.find((node) => node.matched);
      setSelectedNodeId((matchedNode || nodes[0]).id);
    }
  }, [graphData.nodes, graphData.summary, selectedNodeId]);

  useEffect(() => {
    const handleResize = () => setIsWideLayout(window.innerWidth >= 1180);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchGraph = async (paramsSource = searchParams) => {
    setLoading(true);
    try {
      const params = {};
      const query = paramsSource.get("q");
      const types = paramsSource.get("types");
      const focusType = paramsSource.get("focus_type");
      const focusId = paramsSource.get("focus_id");
      const include = paramsSource.get("include_isolated");
      if (query) params.q = query;
      if (types) params.types = types;
      if (focusType) params.focus_type = focusType;
      if (focusId) params.focus_id = focusId;
      if (include) params.include_isolated = include;
      const response = await api.get("/api/knowledge/graph/", { params });
      setGraphData(response?.data || { nodes: [], edges: [], summary: {} });
    } catch (error) {
      console.error("Error:", error);
      setGraphData({ nodes: [], edges: [], summary: {} });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = ({ keepFocus = false } = {}) => {
    const next = new URLSearchParams();
    const trimmed = graphQuery.trim();
    if (trimmed) next.set("q", trimmed);
    if (activeTypes.length) next.set("types", activeTypes.join(","));
    if (!includeIsolated) next.set("include_isolated", "false");
    if (keepFocus) {
      const focusType = searchParams.get("focus_type");
      const focusId = searchParams.get("focus_id");
      if (focusType && focusId) {
        next.set("focus_type", focusType);
        next.set("focus_id", focusId);
      }
    }
    setSearchParams(next);
  };

  const clearFilters = () => {
    setGraphQuery("");
    setActiveTypes([]);
    setIncludeIsolated(true);
    setSearchParams({});
  };

  const focusNodeInGraph = (node) => {
    const [focusType, focusId] = (node?.id || "").split("_");
    if (!focusType || !focusId) return;

    const next = new URLSearchParams();
    const trimmed = graphQuery.trim();
    if (trimmed) next.set("q", trimmed);
    if (activeTypes.length) next.set("types", activeTypes.join(","));
    if (!includeIsolated) next.set("include_isolated", "false");
    next.set("focus_type", focusType);
    next.set("focus_id", focusId);
    setSearchParams(next);
  };

  const getNodeColor = (type) => {
    const colors = {
      conversation: palette.info,
      decision: palette.accent,
      goal: darkMode ? "#86efac" : "#15803d",
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
      goal: "Goal",
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
      goal: FlagIcon,
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
      goal: `/business/goals/${id}`,
      task: "/business/tasks",
      meeting: `/business/meetings/${id}`,
      document: `/business/documents/${id}`,
    };
    return routes[type] || "/knowledge";
  };

  const { adjacencyMap, degreeMap, hubNodeId } = useMemo(() => {
    const nodes = graphData.nodes || [];
    const edges = graphData.edges || [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const adjacency = {};
    const degrees = {};

    nodes.forEach((node) => {
      adjacency[node.id] = new Set();
      degrees[node.id] = 0;
    });

    edges.forEach((edge) => {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
      adjacency[edge.source].add(edge.target);
      adjacency[edge.target].add(edge.source);
      degrees[edge.source] += 1;
      degrees[edge.target] += 1;
    });

    const focusNode = graphData.summary?.focus_node;
    const matchedNode = nodes.find((node) => node.matched)?.id;
    const rankedNodes = [...nodes].sort((left, right) => {
      const degreeDelta = (degrees[right.id] || 0) - (degrees[left.id] || 0);
      if (degreeDelta !== 0) return degreeDelta;
      return typeSortIndex(left.type) - typeSortIndex(right.type);
    });

    return {
      adjacencyMap: adjacency,
      degreeMap: degrees,
      hubNodeId:
        (focusNode && nodeIds.has(focusNode) ? focusNode : null) ||
        matchedNode ||
        rankedNodes[0]?.id ||
        null,
    };
  }, [graphData.edges, graphData.nodes, graphData.summary]);

  const positionedNodes = useMemo(() => {
    const nodes = graphData.nodes || [];
    if (nodes.length === 0) return [];

    const nodeById = nodes.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});

    const centerX = GRAPH_WIDTH / 2;
    const centerY = GRAPH_HEIGHT / 2;
    const hubId = hubNodeId || nodes[0]?.id;
    const placed = new Map();

    const setPosition = (node, x, y, extras = {}) => {
      placed.set(node.id, {
        ...node,
        x: clamp(x, GRAPH_MARGIN_X, GRAPH_WIDTH - GRAPH_MARGIN_X),
        y: clamp(y, GRAPH_MARGIN_Y, GRAPH_HEIGHT - GRAPH_MARGIN_Y),
        ...extras,
      });
    };

    const hubNode = nodeById[hubId] || nodes[0];
    setPosition(hubNode, centerX, centerY, {
      ring: "hub",
      degree: degreeMap[hubNode.id] || 0,
    });

    const primaryNodes = [...(adjacencyMap[hubNode.id] || new Set())]
      .map((id) => nodeById[id])
      .filter(Boolean)
      .sort((left, right) => {
        const degreeDelta = (degreeMap[right.id] || 0) - (degreeMap[left.id] || 0);
        if (degreeDelta !== 0) return degreeDelta;
        return typeSortIndex(left.type) - typeSortIndex(right.type);
      });

    const primaryRadiusX = primaryNodes.length > 6 ? 238 : 214;
    const primaryRadiusY = primaryNodes.length > 6 ? 174 : 152;

    primaryNodes.forEach((node, index) => {
      const angle = (-Math.PI / 2) + (index / Math.max(primaryNodes.length, 1)) * Math.PI * 2;
      const point = polarPosition(centerX, centerY, primaryRadiusX, primaryRadiusY, angle);
      setPosition(node, point.x, point.y, {
        ring: "primary",
        angle,
        degree: degreeMap[node.id] || 0,
      });
    });

    const remainingNodes = nodes
      .filter((node) => !placed.has(node.id))
      .sort((left, right) => {
        const degreeDelta = (degreeMap[right.id] || 0) - (degreeMap[left.id] || 0);
        if (degreeDelta !== 0) return degreeDelta;
        return typeSortIndex(left.type) - typeSortIndex(right.type);
      });

    const outerGroups = TYPE_ORDER.map((type) => ({
      type,
      nodes: remainingNodes.filter((node) => (node.type || "other") === type),
    })).filter((group) => group.nodes.length > 0);

    outerGroups.forEach((group, groupIndex) => {
      const sectorAngle = (-Math.PI / 2) + (groupIndex / Math.max(outerGroups.length, 1)) * Math.PI * 2;
      const anchor = polarPosition(centerX, centerY, 370, 250, sectorAngle);

      group.nodes.forEach((node, nodeIndex) => {
        const row = Math.floor(nodeIndex / 3);
        const slot = (nodeIndex % 3) - 1;
        const angleOffset = group.nodes.length === 1 ? 0 : (nodeIndex - (group.nodes.length - 1) / 2) * 0.16;
        const localAngle = sectorAngle + angleOffset;
        const radialDrift = 54 + row * 42;
        const point = polarPosition(anchor.x, anchor.y, radialDrift, radialDrift * 0.72, localAngle);

        setPosition(
          node,
          point.x + slot * 14,
          point.y + slot * 10,
          {
            ring: "outer",
            angle: localAngle,
            degree: degreeMap[node.id] || 0,
          }
        );
      });
    });

    const relaxed = Array.from(placed.values());
    for (let iteration = 0; iteration < 24; iteration += 1) {
      for (let leftIndex = 0; leftIndex < relaxed.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < relaxed.length; rightIndex += 1) {
          const left = relaxed[leftIndex];
          const right = relaxed[rightIndex];
          const dx = right.x - left.x;
          const dy = right.y - left.y;
          const distance = Math.hypot(dx, dy) || 1;
          const minimumSpacing =
            left.ring === "hub" || right.ring === "hub"
              ? 86
              : left.ring === "primary" && right.ring === "primary"
                ? 78
                : 60;

          if (distance >= minimumSpacing) continue;

          const overlap = (minimumSpacing - distance) / 2;
          const unitX = dx / distance;
          const unitY = dy / distance;

          if (left.ring !== "hub") {
            left.x = clamp(left.x - unitX * overlap, GRAPH_MARGIN_X, GRAPH_WIDTH - GRAPH_MARGIN_X);
            left.y = clamp(left.y - unitY * overlap, GRAPH_MARGIN_Y, GRAPH_HEIGHT - GRAPH_MARGIN_Y);
          }

          if (right.ring !== "hub") {
            right.x = clamp(right.x + unitX * overlap, GRAPH_MARGIN_X, GRAPH_WIDTH - GRAPH_MARGIN_X);
            right.y = clamp(right.y + unitY * overlap, GRAPH_MARGIN_Y, GRAPH_HEIGHT - GRAPH_MARGIN_Y);
          }
        }
      }

      relaxed.forEach((node) => {
        if (node.ring === "primary") {
          const target = polarPosition(centerX, centerY, primaryRadiusX, primaryRadiusY, node.angle || 0);
          node.x = clamp((node.x * 0.84) + (target.x * 0.16), GRAPH_MARGIN_X, GRAPH_WIDTH - GRAPH_MARGIN_X);
          node.y = clamp((node.y * 0.84) + (target.y * 0.16), GRAPH_MARGIN_Y, GRAPH_HEIGHT - GRAPH_MARGIN_Y);
        }

        if (node.ring === "outer") {
          const target = polarPosition(centerX, centerY, 388, 258, node.angle || 0);
          node.x = clamp((node.x * 0.88) + (target.x * 0.12), GRAPH_MARGIN_X, GRAPH_WIDTH - GRAPH_MARGIN_X);
          node.y = clamp((node.y * 0.88) + (target.y * 0.12), GRAPH_MARGIN_Y, GRAPH_HEIGHT - GRAPH_MARGIN_Y);
        }
      });
    }

    const positionedById = relaxed.reduce((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});

    return nodes.map((node) => positionedById[node.id] || node);
  }, [adjacencyMap, degreeMap, graphData.nodes, hubNodeId]);

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
      .filter((edge) => edge.node)
      .sort((left, right) => (degreeMap[right.node.id] || 0) - (degreeMap[left.node.id] || 0));
  }, [degreeMap, graphData.edges, nodeMap, selectedNodeId]);

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
  const graphCenterX = GRAPH_WIDTH / 2;
  const graphCenterY = GRAPH_HEIGHT / 2;
  const graphHub = hubNodeId ? nodeMap[hubNodeId] || null : null;
  const graphHubLabel = graphHub?.label || "Hub view";
  const compactHubLabel = graphHubLabel.length > 18 ? `${graphHubLabel.slice(0, 18)}...` : graphHubLabel;

  const hasActiveFilters = Boolean(graphQuery.trim() || activeTypes.length || searchParams.get("focus_type"));
  const activeQuerySummary = graphData.summary?.query ? `"${graphData.summary.query}"` : "No text filter";
  const typeScopeSummary = activeTypes.length
    ? activeTypes.map((type) => getNodeLabel(type)).join(", ")
    : "All record types";
  const hotspotNodes = useMemo(
    () =>
      [...positionedNodes]
        .sort((left, right) => {
          const degreeDelta = (right.connection_count || degreeMap[right.id] || 0) - (left.connection_count || degreeMap[left.id] || 0);
          if (degreeDelta !== 0) return degreeDelta;
          return typeSortIndex(left.type) - typeSortIndex(right.type);
        })
        .slice(0, 5),
    [degreeMap, positionedNodes]
  );
  const selectedStatusLabel = selectedNode
    ? selectedNode.focused
      ? "Focus lens"
      : selectedNode.matched
        ? "Query match"
        : "Connected record"
    : "Waiting";
  const heroStats = [
    {
      label: "Visible records",
      value: graphData.summary?.total_nodes || 0,
      helper: "Records currently in the network view",
      tone: palette.accent,
    },
    {
      label: "Relationship lines",
      value: graphData.summary?.total_edges || 0,
      helper: "Links keeping the current neighborhood connected",
      tone: palette.info,
    },
    {
      label: "Query matches",
      value: graphData.summary?.matched_nodes || 0,
      helper: graphData.summary?.query ? "Records matching the active search" : "Add a query to spotlight matching records",
      tone: palette.success,
    },
  ];

  const graphAside = (
    <div
      style={{
        ...asideCard,
        border: `1px solid ${palette.border}`,
        background: palette.card,
      }}
    >
      <p style={{ ...asideEyebrow, color: palette.muted }}>Graph readout</p>
      <h3 style={{ ...asideTitle, color: palette.text }}>Move from the loudest cluster into the details that support it.</h3>
      <p style={{ ...asideBody, color: palette.muted }}>
        The map keeps one hub in focus, lets you narrow the visible record types, and gives you a faster way to jump across the densest context pockets.
      </p>
      <div style={asideMetricRail}>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Hub</p>
          <p style={{ ...asideMetricValue, color: palette.text, fontSize: 14 }}>{compactHubLabel}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Isolated</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{graphData.summary?.isolated_nodes || 0}</p>
        </div>
        <div style={{ ...asideMetric, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
          <p style={{ ...asideMetricLabel, color: palette.muted }}>Density</p>
          <p style={{ ...asideMetricValue, color: palette.text }}>{edgeDensity}</p>
        </div>
      </div>
    </div>
  );

  const primaryActionButton = {
    ...ui.primaryButton,
    borderRadius: 10,
    padding: "10px 14px",
  };

  const secondaryActionButton = {
    ...ui.secondaryButton,
    borderRadius: 10,
    padding: "10px 14px",
  };

  const typeToggleButton = (active, type) => ({
    borderRadius: 10,
    border: `1px solid ${active ? getNodeColor(type) : palette.border}`,
    background: active ? (darkMode ? "rgba(96,165,250,0.14)" : "rgba(96,165,250,0.11)") : palette.card,
    color: active ? palette.text : palette.muted,
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  });

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                borderRadius: 16,
                height: 150,
                background: palette.card,
                border: `1px solid ${palette.border}`,
                opacity: 0.76,
              }}
            />
          ))}
        </div>
        <div style={{ borderRadius: 18, height: 540, background: palette.card, border: `1px solid ${palette.border}`, opacity: 0.7 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <WorkspaceHero
        palette={palette}
        darkMode={darkMode}
        variant="memory"
        eyebrow="Workspace Memory"
        title="Knowledge Graph"
        description="Trace how conversations, decisions, goals, meetings, documents, and tasks reinforce each other so the reasoning behind execution stays legible."
        stats={heroStats}
        aside={graphAside}
        actions={
          <>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/knowledge")} style={primaryActionButton}>
              <MagnifyingGlassIcon style={icon14} /> Open Knowledge Search
            </button>
            <button className="ui-btn-polish ui-focus-ring" onClick={() => fetchGraph()} style={secondaryActionButton}>
              <ArrowPathIcon style={icon14} /> Refresh Graph
            </button>
            {hasActiveFilters ? (
              <button className="ui-btn-polish ui-focus-ring" onClick={clearFilters} style={secondaryActionButton}>
                <XMarkIcon style={icon14} /> Clear Filters
              </button>
            ) : null}
          </>
        }
      />

      <WorkspaceToolbar palette={palette} variant="memory" darkMode={darkMode}>
        <div style={controlDeck}>
          <div style={controlColumn}>
            <div style={toolbarIntro}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Control deck</p>
              <h2 style={{ ...toolbarTitle, color: palette.text }}>Shape the network before you read it</h2>
              <p style={{ ...toolbarCopy, color: palette.muted }}>
                Search for a record, limit the graph by entity type, and decide whether isolated items should stay in view while you inspect the neighborhood.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters({ keepFocus: true });
              }}
              style={filterFormShell(palette)}
            >
              <div style={searchRowLayout(isWideLayout)}>
                <div style={{ position: "relative" }}>
                  <MagnifyingGlassIcon style={{ width: 15, height: 15, position: "absolute", left: 12, top: 12, color: palette.muted }} />
                  <input
                    value={graphQuery}
                    onChange={(event) => setGraphQuery(event.target.value)}
                    placeholder="Search the visible graph..."
                    className="ui-focus-ring"
                    style={{ ...ui.input, borderRadius: 12, paddingLeft: 34 }}
                  />
                </div>
                <button type="submit" className="ui-btn-polish ui-focus-ring" style={primaryActionButton}>
                  <AdjustmentsHorizontalIcon style={icon14} /> Apply lens
                </button>
                <button type="button" onClick={clearFilters} className="ui-btn-polish ui-focus-ring" style={secondaryActionButton}>
                  <XMarkIcon style={icon14} /> Reset view
                </button>
              </div>

              <div style={filterLabelRow}>
                <p style={{ ...toolbarEyebrow, color: palette.muted }}>Record types</p>
                <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>
                  {typeScopeSummary}
                </p>
              </div>

              <div style={filterPillRail}>
                {TYPE_ORDER.filter((type) => type !== "other").map((type) => {
                  const active = activeTypes.includes(type);
                  const Icon = getNodeIcon(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setActiveTypes((current) =>
                          current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
                        )
                      }
                      className="ui-btn-polish ui-focus-ring"
                      style={typeToggleButton(active, type)}
                    >
                      <span style={{ ...legendDot, background: getNodeColor(type) }} />
                      <Icon style={icon12} />
                      {getNodeLabel(type)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIncludeIsolated((current) => !current)}
                  className="ui-btn-polish ui-focus-ring"
                  style={{
                    ...secondaryActionButton,
                    padding: "8px 10px",
                    fontSize: 11,
                    background: includeIsolated ? palette.card : darkMode ? "rgba(248,113,113,0.12)" : "#fef2f2",
                  }}
                >
                  {includeIsolated ? "Hide isolated records" : "Show isolated records"}
                </button>
              </div>
            </form>
          </div>

          <div style={readoutGrid}>
            <div style={readoutCard(palette)}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Focus hub</p>
              <h3 style={{ ...readoutValue, color: palette.text }}>{graphHubLabel}</h3>
              <p style={{ ...readoutMeta, color: palette.muted }}>
                {(graphHub?.connection_count || degreeMap[graphHub?.id] || 0)} direct links are anchoring the current view.
              </p>
            </div>
            <div style={readoutCard(palette)}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Query scope</p>
              <h3 style={{ ...readoutValue, color: palette.text }}>{graphData.summary?.query ? `${graphData.summary?.matched_nodes || 0} matches` : "Open view"}</h3>
              <p style={{ ...readoutMeta, color: palette.muted }}>{activeQuerySummary}</p>
            </div>
            <div style={readoutCard(palette)}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Isolation</p>
              <h3 style={{ ...readoutValue, color: palette.text }}>{includeIsolated ? "Visible" : "Collapsed"}</h3>
              <p style={{ ...readoutMeta, color: palette.muted }}>
                {graphData.summary?.isolated_nodes || 0} isolated records in the current lens.
              </p>
            </div>
            <div style={readoutCard(palette)}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Entity spread</p>
              <h3 style={{ ...readoutValue, color: palette.text }}>{typeSummary.length}</h3>
              <p style={{ ...readoutMeta, color: palette.muted }}>
                Distinct record types visible across this graph window.
              </p>
            </div>
          </div>
        </div>

        {hotspotNodes.length ? (
          <div style={hotspotSection}>
            <div style={filterLabelRow}>
              <p style={{ ...toolbarEyebrow, color: palette.muted }}>Hotspots</p>
              <p style={{ margin: 0, color: palette.muted, fontSize: 12 }}>
                Jump to the densest context pockets without losing the current lens.
              </p>
            </div>
            <div style={hotspotRail}>
              {hotspotNodes.map((node) => (
                <button
                  key={`hotspot-${node.id}`}
                  type="button"
                  className="ui-btn-polish ui-focus-ring"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    focusNodeInGraph(node);
                  }}
                  style={hotspotButtonStyle(palette, node.id === selectedNodeId)}
                >
                  <span style={{ ...legendDot, background: getNodeColor(node.type || "other") }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={hotspotTitleStyle(palette)}>{node.label || getNodeLabel(node.type || "other")}</span>
                    <span style={hotspotMetaStyle(palette)}>
                      {node.connection_count || degreeMap[node.id] || 0} links
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </WorkspaceToolbar>

      {positionedNodes.length === 0 ? (
        <WorkspaceEmptyState
          palette={palette}
          variant="memory"
          darkMode={darkMode}
          title="No graph connections yet"
          description="As conversations, decisions, goals, meetings, tasks, and documents accumulate, the graph will start surfacing how they relate."
          action={
            <button className="ui-btn-polish ui-focus-ring" onClick={() => navigate("/knowledge")} style={primaryActionButton}>
              Go To Knowledge
            </button>
          }
        />
      ) : (
        <section style={graphWorkspaceLayout(isWideLayout)}>
          <WorkspacePanel
            palette={palette}
            variant="memory"
            darkMode={darkMode}
            eyebrow="Network Canvas"
            title="Context constellation"
            description="The canvas keeps one record at the center, fans immediate context into a readable ring, and leaves the outer orbit for secondary evidence."
            action={
              <div style={canvasActionWrap}>
                <span style={{ ...panelStatChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                  Hub / {compactHubLabel}
                </span>
                <span style={{ ...panelStatChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}>
                  {graphData.edges?.length || 0} edges
                </span>
              </div>
            }
            minHeight={520}
          >
            <div style={canvasOverviewGrid}>
              <div style={canvasOverviewCard(palette)}>
                <p style={{ ...toolbarEyebrow, color: palette.muted }}>Current lens</p>
                <h3 style={{ ...readoutValue, color: palette.text }}>{graphData.summary?.focus_node ? "Focused neighborhood" : "Whole neighborhood"}</h3>
                <p style={{ ...readoutMeta, color: palette.muted }}>
                  {graphData.summary?.focus_node
                    ? "The canvas is constrained around one record and its immediate links."
                    : "The graph is showing the strongest visible cluster across the current filters."}
                </p>
              </div>
              <div style={canvasOverviewCard(palette)}>
                <p style={{ ...toolbarEyebrow, color: palette.muted }}>Type coverage</p>
                <div style={legendRail}>
                  {TYPE_ORDER.filter((type) => nodeTypeCounts[type]).map((type) => {
                    const Icon = getNodeIcon(type);
                    return (
                      <span
                        key={type}
                        style={{ ...legendChip, border: `1px solid ${palette.border}`, background: palette.cardAlt, color: palette.text }}
                      >
                        <span style={{ ...legendDot, background: getNodeColor(type) }} />
                        <Icon style={icon12} />
                        {getNodeLabel(type)} {nodeTypeCounts[type]}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={graphFrameShell(palette, darkMode)}>
              <div style={graphCanvasHeader}>
                <div style={{ display: "grid", gap: 3 }}>
                  <p style={{ ...toolbarEyebrow, color: palette.muted }}>Reading path</p>
                  <p style={{ margin: 0, color: palette.text, fontSize: 13, fontWeight: 700 }}>
                    Start at the center, scan the primary ring, then follow outer records only when they reinforce the story.
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {selectedNode ? (
                    <button
                      type="button"
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => focusNodeInGraph(selectedNode)}
                      style={secondaryActionButton}
                    >
                      Center on selection
                    </button>
                  ) : null}
                  {graphHub ? (
                    <button
                      type="button"
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => {
                        setSelectedNodeId(graphHub.id);
                        focusNodeInGraph(graphHub);
                      }}
                      style={secondaryActionButton}
                    >
                      Recenter on hub
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={graphFrame}>
                <div style={{ overflowX: "auto" }}>
                  <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} style={{ width: "100%", minWidth: 820, borderRadius: 18 }}>
                    <defs>
                      <pattern id="graph-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" stroke={darkMode ? "rgba(245,239,230,0.04)" : "rgba(58,47,38,0.05)"} strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width={GRAPH_WIDTH} height={GRAPH_HEIGHT} rx="22" fill={darkMode ? "#141b26" : "#f6fbff"} />
                    <rect
                      x="0"
                      y="0"
                      width={GRAPH_WIDTH}
                      height={GRAPH_HEIGHT}
                      rx="22"
                      fill={darkMode ? "rgba(59,130,246,0.05)" : "rgba(96,165,250,0.08)"}
                    />
                    <rect x="0" y="0" width={GRAPH_WIDTH} height={GRAPH_HEIGHT} rx="22" fill="url(#graph-grid)" />
                    <circle
                      cx={graphCenterX}
                      cy={graphCenterY}
                      r="116"
                    fill="none"
                    stroke={darkMode ? "rgba(245,239,230,0.06)" : "rgba(58,47,38,0.06)"}
                    strokeWidth="1"
                  />
                  <circle
                    cx={graphCenterX}
                    cy={graphCenterY}
                    r="224"
                    fill="none"
                    stroke={darkMode ? "rgba(245,239,230,0.05)" : "rgba(58,47,38,0.05)"}
                    strokeWidth="1"
                  />
                  <circle
                    cx={graphCenterX}
                    cy={graphCenterY}
                    r="328"
                    fill="none"
                    stroke={darkMode ? "rgba(245,239,230,0.04)" : "rgba(58,47,38,0.04)"}
                    strokeWidth="1"
                  />
                  {graphHub ? (
                    <circle
                      cx={graphHub.x}
                      cy={graphHub.y}
                      r="72"
                      fill={darkMode ? "rgba(96,165,250,0.08)" : "rgba(59,130,246,0.08)"}
                    />
                  ) : null}

                  {(graphData.edges || []).map((edge, index) => {
                    const sourceNode = nodeMap[edge.source];
                    const targetNode = nodeMap[edge.target];
                    if (!sourceNode || !targetNode) return null;

                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const distance = Math.hypot(dx, dy) || 1;
                    const centerPull = Math.min(0.28, 110 / distance);
                    const controlOneX = sourceNode.x + (dx * 0.3) + ((graphCenterX - sourceNode.x) * centerPull);
                    const controlOneY = sourceNode.y + (dy * 0.3) + ((graphCenterY - sourceNode.y) * centerPull);
                    const controlTwoX = sourceNode.x + (dx * 0.7) + ((graphCenterX - targetNode.x) * centerPull);
                    const controlTwoY = sourceNode.y + (dy * 0.7) + ((graphCenterY - targetNode.y) * centerPull);
                    const isSelected =
                      edge.source === selectedNodeId || edge.target === selectedNodeId;

                    return (
                      <path
                        key={`${edge.source}-${edge.target}-${index}`}
                        d={`M ${sourceNode.x} ${sourceNode.y} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${targetNode.x} ${targetNode.y}`}
                        fill="none"
                        stroke={isSelected ? palette.accent : darkMode ? "rgba(245,239,230,0.16)" : "rgba(58,47,38,0.12)"}
                        strokeWidth={isSelected ? 2.3 : 1.4}
                        opacity={isSelected ? 0.94 : 0.78}
                      />
                    );
                  })}

                  {positionedNodes.map((node) => {
                    const selected = node.id === selectedNodeId;
                    const matched = Boolean(node.matched);
                    const nodeColor = getNodeColor(node.type || "other");
                    const label = node.label || getNodeLabel(node.type || "other");
                    const labelPlacement = getNodeLabelPlacement(node, graphCenterX, graphCenterY);
                    const nodeRadius = node.ring === "hub" ? 30 : node.ring === "primary" ? 23 : 18;
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
                            r={nodeRadius + 14}
                            fill="none"
                            stroke={nodeColor}
                            strokeOpacity="0.25"
                            strokeWidth="18"
                          />
                        ) : null}
                        {matched && !selected ? (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius + 10}
                            fill="none"
                            stroke={nodeColor}
                            strokeOpacity="0.18"
                            strokeWidth="10"
                          />
                        ) : null}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={selected ? nodeRadius + 4 : nodeRadius}
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
                          style={{ fontSize: node.ring === "hub" ? 13 : 11, fontWeight: 700 }}
                        >
                          {getNodeLabel(node.type || "other").charAt(0)}
                        </text>
                        <text
                          x={labelPlacement.x}
                          y={labelPlacement.y}
                          textAnchor={labelPlacement.anchor}
                          fill={darkMode ? "#c5d7ee" : "#38516d"}
                          style={{
                            fontSize: node.ring === "hub" ? 12 : 11,
                            fontWeight: selected || matched || node.ring === "hub" ? 700 : 600,
                            paintOrder: "stroke",
                            stroke: darkMode ? "#141b26" : "#f6fbff",
                            strokeWidth: 5,
                            strokeLinejoin: "round",
                          }}
                        >
                          {label.length > 22 ? `${label.slice(0, 22)}...` : label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
          </WorkspacePanel>

          <div style={{ display: "grid", gap: 10 }}>
            <WorkspacePanel
              palette={palette}
              variant="memory"
              darkMode={darkMode}
              eyebrow="Inspector"
              title={selectedNode ? selectedNode.label || getNodeLabel(selectedNode.type || "other") : "Select a node"}
              description={
                selectedNode
                  ? `${getNodeLabel(selectedNode.type || "other")} records nearby explain why this item matters in the broader workspace graph.`
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
                    <div style={{ ...inspectorStat, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                      <p style={{ ...inspectorLabel, color: palette.muted }}>State</p>
                      <p style={{ ...inspectorValue, color: palette.text }}>{selectedStatusLabel}</p>
                    </div>
                    <div style={{ ...inspectorStat, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                      <p style={{ ...inspectorLabel, color: palette.muted }}>Record id</p>
                      <p style={{ ...inspectorValue, color: palette.text }}>{selectedNode.object_id}</p>
                    </div>
                  </div>

                  {selectedNode.preview ? (
                    <div style={{ ...inspectorStat, border: `1px solid ${palette.border}`, background: palette.cardAlt }}>
                      <p style={{ ...inspectorLabel, color: palette.muted }}>Preview</p>
                      <p style={{ margin: 0, color: palette.text, fontSize: 12, lineHeight: 1.55 }}>{selectedNode.preview}</p>
                    </div>
                  ) : null}

                  <div style={inspectorButtonRail}>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => navigate(getNodeRoute(selectedNode))}
                      style={primaryActionButton}
                    >
                      Open record
                    </button>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => focusNodeInGraph(selectedNode)}
                      style={secondaryActionButton}
                    >
                      Center graph here
                    </button>
                    <button
                      className="ui-btn-polish ui-focus-ring"
                      onClick={() => navigate("/knowledge")}
                      style={secondaryActionButton}
                    >
                      Knowledge search
                    </button>
                  </div>

                  <div style={inspectorSection}>
                    <p style={{ ...inspectorSectionLabel, color: palette.muted }}>Connected records</p>
                    <div style={connectionList}>
                      {selectedConnections.length === 0 ? (
                        <div style={{ ...connectionCard, border: `1px dashed ${palette.border}`, background: palette.cardAlt, cursor: "default" }}>
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
                                {getNodeLabel(edge.node.type || "other")} | {String(edge.type || "relates_to").replace(/_/g, " ")}
                              </span>
                            </span>
                            <ArrowRightIcon style={{ ...icon12, color: palette.muted, flexShrink: 0 }} />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <WorkspaceEmptyState
                  palette={palette}
                  variant="memory"
                  darkMode={darkMode}
                  title="Choose a node"
                  description="Click a node in the network to inspect related records and open the underlying source."
                />
              )}
            </WorkspacePanel>

            <WorkspacePanel
              palette={palette}
              variant="memory"
              darkMode={darkMode}
              eyebrow="Map Readout"
              title="What this graph is emphasizing"
              description="Keep the overall entity mix and current lens in sight while you inspect individual records."
            >
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

              <div style={readoutStack}>
                <div style={canvasOverviewCard(palette)}>
                  <p style={{ ...toolbarEyebrow, color: palette.muted }}>Active query</p>
                  <p style={{ margin: 0, color: palette.text, fontSize: 13, fontWeight: 700 }}>{activeQuerySummary}</p>
                </div>
                <div style={canvasOverviewCard(palette)}>
                  <p style={{ ...toolbarEyebrow, color: palette.muted }}>Type scope</p>
                  <p style={{ margin: 0, color: palette.text, fontSize: 13, fontWeight: 700 }}>{typeScopeSummary}</p>
                </div>
              </div>
            </WorkspacePanel>
          </div>
        </section>
      )}
    </div>
  );
}

const controlDeck = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12,
};

const controlColumn = {
  display: "grid",
  gap: 10,
  minWidth: 0,
};

function filterFormShell(palette) {
  return {
    display: "grid",
    gap: 10,
    borderRadius: 16,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: 12,
  };
}

function searchRowLayout(isWideLayout) {
  return {
    display: "grid",
    gridTemplateColumns: isWideLayout ? "minmax(0,1fr) auto auto" : "minmax(0,1fr)",
    gap: 8,
  };
}

const filterLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const filterPillRail = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const readoutGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  minWidth: 0,
};

function readoutCard(palette) {
  return {
    borderRadius: 14,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: "12px 12px",
    display: "grid",
    gap: 6,
    minWidth: 0,
  };
}

const readoutValue = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.12,
  fontWeight: 700,
  letterSpacing: "-0.02em",
};

const readoutMeta = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
};

const hotspotSection = {
  display: "grid",
  gap: 8,
};

const hotspotRail = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 8,
};

function hotspotButtonStyle(palette, active) {
  return {
    borderRadius: 12,
    border: `1px solid ${active ? palette.accent : palette.border}`,
    background: active ? palette.card : palette.cardAlt,
    padding: "10px 11px",
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignItems: "center",
    gap: 10,
    textAlign: "left",
    cursor: "pointer",
  };
}

const hotspotTitleStyle = (palette) => ({
  display: "block",
  color: palette.text,
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const hotspotMetaStyle = (palette) => ({
  display: "block",
  color: palette.muted,
  fontSize: 11,
  marginTop: 4,
});

function graphWorkspaceLayout(isWideLayout) {
  return {
    display: "grid",
    gridTemplateColumns: isWideLayout ? "minmax(0, 1.7fr) minmax(320px, 0.9fr)" : "minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
  };
}

const canvasActionWrap = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const canvasOverviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

function canvasOverviewCard(palette) {
  return {
    borderRadius: 14,
    border: `1px solid ${palette.border}`,
    background: palette.cardAlt,
    padding: "12px 12px",
    display: "grid",
    gap: 8,
  };
}

function graphFrameShell(palette, darkMode) {
  return {
    borderRadius: 18,
    border: `1px solid ${palette.border}`,
    background: darkMode
      ? "linear-gradient(180deg, rgba(20,27,38,0.98), rgba(13,18,26,0.96))"
      : "linear-gradient(180deg, rgba(248,252,255,0.98), rgba(240,247,255,0.96))",
    padding: 12,
    display: "grid",
    gap: 10,
  };
}

const graphCanvasHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
};

const readoutStack = {
  display: "grid",
  gap: 8,
};

const toolbarIntro = {
  display: "grid",
  gap: 4,
};

const toolbarEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const toolbarTitle = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.08,
};

const toolbarCopy = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.55,
  maxWidth: 720,
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
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 11,
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
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
};

const graphFrame = {
  borderRadius: 16,
  overflow: "hidden",
  minHeight: 0,
};

const asideCard = {
  minWidth: 240,
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 8,
};

const asideEyebrow = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const asideTitle = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.08,
};

const asideBody = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
};

const asideMetricRail = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const asideMetric = {
  borderRadius: 12,
  padding: "9px 10px",
  display: "grid",
  gap: 3,
};

const asideMetricLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const asideMetricValue = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1,
};

const inspectorStatGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const inspectorStat = {
  borderRadius: 12,
  padding: "10px 11px",
  display: "grid",
  gap: 3,
};

const inspectorLabel = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const inspectorValue = {
  margin: 0,
  fontSize: 15,
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
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const connectionList = {
  display: "grid",
  gap: 8,
};

const connectionCard = {
  borderRadius: 12,
  padding: "10px 11px",
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
  borderRadius: 12,
  padding: "9px 11px",
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
