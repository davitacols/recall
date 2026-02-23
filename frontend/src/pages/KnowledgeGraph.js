import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function KnowledgeGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/knowledge/graph/', {
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
      conversation: '#3b82f6',
      decision: '#8b5cf6',
      task: '#10b981',
      meeting: '#f59e0b',
      document: '#6b7280'
    };
    return colors[type] || '#6b7280';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading graph...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Knowledge Graph
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize connections between conversations, decisions, and tasks
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Conversations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Decisions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Meetings</span>
          </div>
        </div>

        <svg width="100%" height="600" className="border border-gray-200 dark:border-gray-700 rounded">
          {/* Draw edges */}
          {graphData.edges.map((edge, idx) => {
            const sourceNode = graphData.nodes.find(n => n.id === edge.source);
            const targetNode = graphData.nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const sourceX = (idx % 10) * 100 + 50;
            const sourceY = Math.floor(idx / 10) * 100 + 50;
            const targetX = ((idx + 1) % 10) * 100 + 50;
            const targetY = Math.floor((idx + 1) / 10) * 100 + 50;

            return (
              <line
                key={idx}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#d1d5db"
                strokeWidth="2"
                opacity="0.5"
              />
            );
          })}

          {/* Draw nodes */}
          {graphData.nodes.map((node, idx) => {
            const x = (idx % 10) * 100 + 50;
            const y = Math.floor(idx / 10) * 100 + 50;

            return (
              <g key={node.id} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r="20"
                  fill={getNodeColor(node.type)}
                  opacity="0.9"
                />
                <text
                  x={x}
                  y={y + 35}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 dark:fill-gray-300"
                >
                  {node.label.substring(0, 15)}...
                </text>
              </g>
            );
          })}
        </svg>

        {graphData.nodes.length === 0 && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No connections yet. Create conversations and decisions to see the knowledge graph.
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>{graphData.nodes.length}</strong> nodes, <strong>{graphData.edges.length}</strong> connections</p>
        </div>
      </div>
    </div>
  );
}
