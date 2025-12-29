import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

function AISummaryPanel({ conversation, onExplainSimply, loadingExplanation, simpleExplanation }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!conversation.ai_summary && !conversation.ai_action_items?.length) {
    return null;
  }

  return (
    <div className="sticky top-8 bg-white border border-gray-200 mb-8">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-xl font-bold text-gray-900">Summary</h2>
        {isCollapsed ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}
      </button>
      
      {!isCollapsed && (
        <div className="px-6 pb-6">
      {/* AI Summary */}
      {conversation.ai_summary && (
        <div className="mb-6">
          <p className="text-base text-gray-700 leading-relaxed mb-4">
            {conversation.ai_summary}
          </p>
        </div>
      )}

      {/* Decision (if any) */}
      {conversation.post_type === 'decision' && conversation.decision_outcome && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Decision</h3>
          <p className="text-base text-gray-700">{conversation.decision_outcome}</p>
        </div>
      )}

      {/* Action Items */}
      {conversation.ai_action_items?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Action Items</h3>
          <div className="space-y-2">
            {conversation.ai_action_items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-gray-900 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Level */}
      {conversation.confidence_level && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Confidence Level</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 h-2">
              <div 
                className="bg-gray-900 h-2" 
                style={{ width: `${conversation.confidence_level}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-700">{conversation.confidence_level}%</span>
          </div>
        </div>
      )}

      {/* Explain Simply Button */}
      <button
        onClick={onExplainSimply}
        disabled={loadingExplanation}
        className="w-full px-4 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-medium transition-all disabled:opacity-50"
      >
        {loadingExplanation ? 'Generating...' : 'Explain simply'}
      </button>

          {/* Simple Explanation */}
          {simpleExplanation && (
            <div className="mt-4 p-4 bg-gray-50 border-l-2 border-gray-900">
              <p className="text-sm font-bold text-gray-900 mb-2">Summary generated · Edit anytime</p>
              <p className="text-sm text-gray-700 leading-relaxed">{simpleExplanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AISummaryPanel;
