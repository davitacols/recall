import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DeveloperInsights = ({ conversationId }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [conversationId]);

  const fetchInsights = async () => {
    try {
      const response = await api.get(`/api/conversations/${conversationId}/developer-insights/`);
      if (response.data.simple_summary) {
        setInsights(response.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const processWithDeveloperMode = async () => {
    setProcessing(true);
    try {
      const response = await api.post(`/api/conversations/${conversationId}/developer-mode/`, {});
      setInsights(response.data);
    } catch (error) {
      console.error('Error processing:', error);
      alert('Failed to process with Developer Mode');
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceBadge = (level) => {
    const colors = {
      high: 'bg-green-600',
      medium: 'bg-yellow-600',
      low: 'bg-red-600'
    };
    return colors[level] || 'bg-gray-600';
  };

  return (
    <div className="border-2 border-black bg-white mt-6">
      <div className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-['League_Spartan'] uppercase tracking-wider text-black font-bold">
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="text-lg font-['League_Spartan'] uppercase tracking-wider text-black font-bold">
            DEVELOPER INSIGHTS
          </h3>
        </div>
        {insights && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              processWithDeveloperMode();
            }}
            disabled={processing}
            className="bg-white text-black px-3 py-1 text-xs font-['League_Spartan'] uppercase tracking-wider hover:bg-black hover:text-white transition-colors border-2 border-black disabled:opacity-50"
          >
            {processing ? 'UPDATING...' : 'REFRESH'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="border-t-2 border-black p-6 space-y-6">
          {!insights ? (
            <div>
              <button
                onClick={processWithDeveloperMode}
                disabled={processing}
                className="bg-black text-white px-4 py-2 text-sm font-['League_Spartan'] uppercase tracking-wider hover:bg-gray-800 transition-colors border-2 border-black disabled:opacity-50"
              >
                {processing ? 'ANALYZING...' : 'ANALYZE WITH DEVELOPER MODE'}
              </button>
              <p className="text-xs text-gray-600 mt-2">
                AI-powered analysis for developer productivity
              </p>
            </div>
          ) : (
            <>
              {/* Simple Summary */}
              {insights.simple_summary && (
                <div>
                  <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-2">
                    SIMPLE SUMMARY
                  </h4>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {insights.simple_summary}
                  </p>
                </div>
              )}

              {/* Technical Decision */}
              {insights.technical_decision && insights.technical_decision.decision_made && (
                <div className="p-4 bg-gray-50 border-2 border-gray-300">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold">
                      TECHNICAL DECISION
                    </h4>
                    {insights.technical_decision.confidence_level && (
                      <span className={`${getConfidenceBadge(insights.technical_decision.confidence_level)} text-white px-2 py-1 text-xs font-['League_Spartan'] uppercase`}>
                        {insights.technical_decision.confidence_level} CONFIDENCE
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-bold text-gray-700">What:</span>
                      <p className="text-gray-800 mt-1">{insights.technical_decision.what_decided}</p>
                    </div>
                    
                    <div>
                      <span className="font-bold text-gray-700">Why:</span>
                      <p className="text-gray-800 mt-1">{insights.technical_decision.why_decided}</p>
                    </div>
                    
                    {insights.technical_decision.alternatives && insights.technical_decision.alternatives.length > 0 && (
                      <div>
                        <span className="font-bold text-gray-700">Alternatives Considered:</span>
                        <ul className="list-disc list-inside text-gray-800 mt-1">
                          {insights.technical_decision.alternatives.map((alt, i) => (
                            <li key={i}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {insights.technical_decision.permanence && (
                      <div>
                        <span className="font-bold text-gray-700">Permanence:</span>
                        <span className="text-gray-800 ml-2 uppercase text-xs">
                          {insights.technical_decision.permanence}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {insights.action_items && insights.action_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-2">
                    ACTION ITEMS
                  </h4>
                  <div className="space-y-2">
                    {insights.action_items.map((item, i) => (
                      <div key={i} className="p-3 border-2 border-gray-300">
                        <p className="text-sm text-gray-800 font-bold">{item.task}</p>
                        {item.responsible && (
                          <p className="text-xs text-gray-600 mt-1">
                            Responsible: {item.responsible}
                          </p>
                        )}
                        {item.blockers && (
                          <p className="text-xs text-red-600 mt-1">
                            Blocker: {item.blockers}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agile Context */}
              {insights.agile_context && insights.agile_context.length > 0 && (
                <div>
                  <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-2">
                    AGILE CONTEXT
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.agile_context.map((context, i) => (
                      <span key={i} className="bg-black text-white px-3 py-1 text-xs font-['League_Spartan'] uppercase tracking-wider">
                        {context}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Future Developer Note */}
              {insights.future_developer_note && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-600">
                  <h4 className="text-sm font-['League_Spartan'] uppercase tracking-wider text-black font-bold mb-2">
                    ⚠️ FUTURE DEVELOPER NOTE
                  </h4>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {insights.future_developer_note}
                  </p>
                </div>
              )}

              {/* Warnings */}
              {insights.warnings && (
                <div className="space-y-2">
                  {insights.warnings.repeated_topic && (
                    <div className="p-3 bg-orange-50 border-2 border-orange-400 text-xs">
                      🔁 This topic has been discussed before.
                    </div>
                  )}
                  {insights.warnings.needs_background && (
                    <div className="p-3 bg-blue-50 border-2 border-blue-400 text-xs">
                      ℹ️ Additional background may be needed for new team members.
                    </div>
                  )}
                  {insights.warnings.has_risk && (
                    <div className="p-3 bg-red-50 border-2 border-red-400 text-xs">
                      ⚠️ {insights.warnings.risk_description || 'Risk or uncertainty exists.'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeveloperInsights;
