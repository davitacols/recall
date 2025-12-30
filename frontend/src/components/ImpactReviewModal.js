import React, { useState } from 'react';

function ImpactReviewModal({ decision, onSubmit, onClose }) {
  const [wasSuccessful, setWasSuccessful] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');

  const handleSubmit = async () => {
    if (wasSuccessful === null) {
      alert('Please indicate if the decision was successful');
      return;
    }
    await onSubmit({
      was_successful: wasSuccessful,
      impact_review_notes: reviewNotes,
      lessons_learned: lessonsLearned
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl p-8 max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Impact Review</h2>
        <p className="text-base text-gray-600 mb-6">
          {decision.title}
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">
              Was this decision successful?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setWasSuccessful(true)}
                className={`flex-1 px-6 py-4 border-2 font-medium transition-colors ${
                  wasSuccessful === true
                    ? 'border-green-600 bg-green-50 text-green-900'
                    : 'border-gray-200 text-gray-900 hover:border-gray-900'
                }`}
              >
                ✓ Yes, it worked
              </button>
              <button
                onClick={() => setWasSuccessful(false)}
                className={`flex-1 px-6 py-4 border-2 font-medium transition-colors ${
                  wasSuccessful === false
                    ? 'border-red-600 bg-red-50 text-red-900'
                    : 'border-gray-200 text-gray-900 hover:border-gray-900'
                }`}
              >
                ✗ No, it didn't
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              What happened?
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Describe the actual outcome and impact..."
              className="w-full p-4 border border-gray-900 focus:outline-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              What did we learn?
            </label>
            <textarea
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="Key lessons for future decisions..."
              className="w-full p-4 border border-gray-900 focus:outline-none"
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
          >
            Submit Review
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-100 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImpactReviewModal;
