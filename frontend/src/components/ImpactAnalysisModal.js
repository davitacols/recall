import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../utils/ThemeAndAccessibility';
import { XMarkIcon, ExclamationTriangleIcon, LinkIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export default function ImpactAnalysisModal({ isOpen, onClose, contentType, contentId }) {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  const bgSecondary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-500' : 'text-gray-600';

  useEffect(() => {
    if (isOpen && contentType && contentId) {
      fetchImpact();
    }
  }, [isOpen, contentType, contentId]);

  const fetchImpact = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:8000/api/knowledge/context/${contentType}/${contentId}/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      
      const riskLevel = calculateRisk(data);
      setImpact({
        connectedItems: data.related_content?.length || 0,
        experts: data.experts?.length || 0,
        riskLevel,
        relatedContent: data.related_content || [],
        risks: generateRisks(data, riskLevel)
      });
    } catch (error) {
      console.error('Error fetching impact:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRisk = (data) => {
    const connections = data.related_content?.length || 0;
    if (connections > 10) return 'high';
    if (connections > 5) return 'medium';
    return 'low';
  };

  const generateRisks = (data, level) => {
    const risks = [];
    const connections = data.related_content?.length || 0;
    
    if (connections > 10) {
      risks.push('High number of dependencies - changes may have wide-reaching effects');
    }
    if (connections > 5) {
      risks.push('Multiple teams may be affected by changes');
    }
    if (data.experts?.length > 3) {
      risks.push('Multiple stakeholders involved - coordination required');
    }
    if (connections === 0) {
      risks.push('No connections found - may be orphaned content');
    }
    
    return risks;
  };

  const getRiskColor = (level) => {
    if (darkMode) {
      return level === 'high' ? 'text-red-400 bg-red-900/20' :
             level === 'medium' ? 'text-yellow-400 bg-yellow-900/20' :
             'text-green-400 bg-green-900/20';
    }
    return level === 'high' ? 'text-red-700 bg-red-50' :
           level === 'medium' ? 'text-yellow-700 bg-yellow-50' :
           'text-green-700 bg-green-50';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`${bgSecondary} border ${borderColor} rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className={`p-6 border-b ${borderColor} flex items-center justify-between`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Impact Analysis</h2>
          <button onClick={onClose} className={`p-2 ${textSecondary} hover:${textPrimary} transition-colors`}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className={`text-sm ${textSecondary}`}>Analyzing impact...</div>
          </div>
        ) : impact && (
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className={`w-5 h-5 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Connected Items</span>
                </div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{impact.connectedItems}</div>
              </div>
              <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <UserGroupIcon className={`w-5 h-5 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Affected Experts</span>
                </div>
                <div className={`text-2xl font-bold ${textPrimary}`}>{impact.experts}</div>
              </div>
              <div className={`p-4 ${bgSecondary} border ${borderColor} rounded-lg`}>
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className={`w-5 h-5 ${textSecondary}`} />
                  <span className={`text-xs ${textSecondary}`}>Risk Level</span>
                </div>
                <div className={`text-lg font-bold capitalize ${getRiskColor(impact.riskLevel)}`}>
                  {impact.riskLevel}
                </div>
              </div>
            </div>

            {/* Risks */}
            {impact.risks.length > 0 && (
              <div className="mb-6">
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Potential Risks</h3>
                <div className="space-y-2">
                  {impact.risks.map((risk, idx) => (
                    <div key={idx} className={`p-3 border ${borderColor} rounded flex items-start gap-2`}>
                      <ExclamationTriangleIcon className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} flex-shrink-0 mt-0.5`} />
                      <span className={`text-sm ${textPrimary}`}>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Content */}
            {impact.relatedContent.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold ${textPrimary} mb-3`}>Connected Content</h3>
                <div className="space-y-2">
                  {impact.relatedContent.slice(0, 10).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        navigate(item.url);
                        onClose();
                      }}
                      className={`p-3 border ${borderColor} rounded cursor-pointer hover:bg-opacity-80 transition-all`}
                    >
                      <div className={`text-sm font-medium ${textPrimary} mb-1`}>{item.title}</div>
                      <div className={`text-xs ${textSecondary} capitalize`}>{item.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
