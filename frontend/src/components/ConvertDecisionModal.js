import React, { useState } from 'react';
import api from '../services/api';
import Button from './Button';

function ConvertDecisionModal({ conversation, onClose, onSuccess }) {
  const [impactLevel, setImpactLevel] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const handleConvert = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/decisions/convert/${conversation.id}/`, {
        impact_level: impactLevel
      });
      
      setAiSummary(res.data.ai_summary);
      alert(`Decision created: "${res.data.title}"`);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to convert: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">Mark as Decision</h2>
          <p className="text-sm text-gray-600 mt-1">Turn this discussion into an official decision</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Conversation Preview */}
          <div className="border border-gray-200 p-4 bg-gray-50">
            <div className="text-sm font-medium text-gray-900 mb-2">{conversation.title}</div>
            <div className="text-sm text-gray-700 line-clamp-3">{conversation.content}</div>
          </div>

          {/* Impact Level */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Impact Level</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high', 'critical'].map(level => (
                <button
                  key={level}
                  onClick={() => setImpactLevel(level)}
                  className={`px-3 py-2 text-sm font-medium border transition-colors ${
                    impactLevel === level
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-900 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-900">
              Once confirmed, this decision will be logged and locked. Changes will require a new version.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="button" onClick={handleConvert} loading={loading}>
            Confirm & Lock Decision
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConvertDecisionModal;
