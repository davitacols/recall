import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function KnowledgeGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const svgRef = useRef(null);

  const bgPrimary = darkMode ? 'bg-stone-950' : 'bg-gray-50';
  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/knowledge/graph/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGraphData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (type) => {
    const colors = {
      conversation: darkMode ? '#60a5fa' : '#3b82f6',
      decision: darkMode ? '#a78bfa' : '#8b5cf6',
      task: darkMode ? '#34d399' : '#10b981',
      meeting: darkMode ? '#fbbf24' : '#f59e0b',
      document: darkMode ? '#94a3b8' : '#6b7280'
    };
    return colors[type] || (darkMode ? '#94a3b8' : '#6b7280');
  };

  const handleNodeClick = (node) => {
    const [type, id] = node.id.split('_');
    const routes = {
      conversation: `/conversations/${id}`,
      decision: `/decisions/${id}`,
      task: `/business/tasks`,
      meeting: `/business/meetings/${id}`,
      document: `/business/documents/${id}`
    };
    if (routes[type]) navigate(routes[type]);
  };

  const calculateLayout = () => {
    const width = 1000;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 80;

    return graphData.nodes.map((node, idx) => {
      const angle = (idx / graphData.nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  };

  const nodes = calculateLayout();

  if (loading) {
    return (
      <div className={`min-h-screen ${bgPrimary} flex items-center justify-center`}>
        <div className={textSecondary}>Loading graph...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgPrimary}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Knowledge Graph</h1>
          <p className={textSecondary}>Visualize connections between conversations, decisions, and tasks</p>
        </div>

        <div className={`${bgSecondary} border ${borderColor} rounded-lg p-6`}>
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('conversation') }}></div>
              <span className={`text-sm ${textSecondary}`}>Conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('decision') }}></div>
              <span className={`text-sm ${textSecondary}`}>Decisions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('task') }}></div>
              <span className={`text-sm ${textSecondary}`}>Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('meeting') }}></div>
              <span className={`text-sm ${textSecondary}`}>Meetings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('document') }}></div>
              <span className={`text-sm ${textSecondary}`}>Documents</span>
            </div>
          </div>

          {graphData.nodes.length === 0 ? (
            <div className={`text-center py-20 ${textSecondary}`}>
              No connections yet. Create conversations and decisions to see the knowledge graph.
            </div>
          ) : (
            <>
              <svg ref={svgRef} width="100%" height="600" viewBox="0 0 1000 600" className={`border ${borderColor} rounded`}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill={darkMode ? '#57534e' : '#d1d5db'} />
                  </marker>
                </defs>

                {/* Draw edges */}
                {graphData.edges.map((edge, idx) => {
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  return (
                    <line
                      key={idx}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={darkMode ? '#57534e' : '#d1d5db'}
                      strokeWidth="2"
                      opacity="0.6"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}

                {/* Draw nodes */}
                {nodes.map((node) => (
                  <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="30"
                      fill={getNodeColor(node.type)}
                      opacity="0.9"
                      className="hover:opacity-100 transition-opacity"
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-medium pointer-events-none"
                      fill="white"
                    >
                      {node.type[0].toUpperCase()}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 45}
                      textAnchor="middle"
                      className={`text-xs pointer-events-none ${textSecondary}`}
                      fill={darkMode ? '#a8a29e' : '#6b7280'}
                    >
                      {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
                    </text>
                  </g>
                ))}
              </svg>

              <div className={`mt-4 text-sm ${textSecondary}`}>
                <p><strong>{graphData.nodes.length}</strong> nodes, <strong>{graphData.edges.length}</strong> connections</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
