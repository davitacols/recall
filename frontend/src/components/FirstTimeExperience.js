import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function FirstTimeExperience() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const isDismissed = localStorage.getItem('ftx_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ftx_dismissed', 'true');
    setDismissed(true);
  };

  const steps = [
    {
      title: 'Post your first update',
      description: 'Share what you\'re working on or a decision you made.',
      action: 'Start writing',
      link: '/conversations'
    },
    {
      title: 'Try searching',
      description: 'Search: "Why did we choose X?" to see how Recall remembers.',
      action: 'Search now',
      link: '/search'
    },
    {
      title: 'Explore a sample decision',
      description: 'See how teams document important choices.',
      action: 'View example',
      link: '/sample-decision'
    }
  ];

  if (dismissed || user?.first_conversation_created) {
    return null;
  }

  return (
    <div className="border-2 border-gray-900 bg-white p-8 mb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Recall
          </h2>
          <p className="text-base text-gray-600">
            Your organization's memory — structured, searchable, and accountable.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`border border-gray-200 p-6 transition-all ${
              currentStep === index ? 'border-gray-900' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                </div>
                <p className="text-base text-gray-600 ml-11">{step.description}</p>
              </div>
              <Link
                to={step.link}
                className="px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-medium text-sm transition-all ml-4"
              >
                {step.action}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">Pro tip:</span> Recall works best when you document decisions as they happen, not after.
        </p>
      </div>
    </div>
  );
}

export default FirstTimeExperience;
