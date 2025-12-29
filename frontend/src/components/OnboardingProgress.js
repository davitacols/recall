import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../hooks/useAuth';

function OnboardingProgress() {
  const { user } = useAuth();

  if (!user || user.onboarding_completed) {
    return null;
  }

  const steps = [
    { key: 'first_conversation_created', label: 'Create your first conversation', completed: user.first_conversation_created },
    { key: 'first_teammate_invited', label: 'Invite a teammate', completed: user.first_teammate_invited },
    { key: 'first_decision_made', label: 'Make a decision', completed: user.first_decision_made }
  ];

  const completedCount = steps.filter(s => s.completed).length;

  if (completedCount === steps.length) {
    return null;
  }

  return (
    <div className="mb-8 border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Getting started</h3>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-3">
            {step.completed ? (
              <CheckCircleIcon className="w-5 h-5 text-gray-900 flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
            )}
            <span className={`text-base ${step.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OnboardingProgress;
