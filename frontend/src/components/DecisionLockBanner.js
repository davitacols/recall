import React, { useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';

function DecisionLockBanner({ decision, onOverride }) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  if (!decision.is_locked) return null;

  const handleOverride = async () => {
    if (!overrideReason.trim()) {
      alert('Override reason required');
      return;
    }
    await onOverride(overrideReason);
    setShowOverrideModal(false);
    setOverrideReason('');
  };

  return (
    <>
      <div className="border-2 border-gray-900 bg-gray-50 p-6 mb-8">
        <div className="flex items-start gap-4">
          <LockClosedIcon className="w-6 h-6 text-gray-900 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">This decision is locked</h3>
            <p className="text-sm text-gray-700 mb-3">
              Locked decisions are final and require explicit justification to change.
            </p>
            {decision.lock_reason && (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Reason:</span> {decision.lock_reason}
              </p>
            )}
            <div className="text-xs text-gray-500">
              Locked by {decision.locked_by_name} on {new Date(decision.locked_at).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-sm font-medium transition-colors"
          >
            Override
          </button>
        </div>
      </div>

      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Override locked decision</h2>
            <p className="text-sm text-gray-600 mb-6">
              This action will be logged. Provide a clear justification for why this decision needs to change.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Why does this decision need to change?"
              className="w-full p-4 border border-gray-900 focus:outline-none mb-6"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={handleOverride}
                className="flex-1 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
              >
                Override
              </button>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DecisionLockBanner;
