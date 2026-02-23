import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const bgPrimary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  const steps = [
    {
      title: 'Welcome to Recall',
      description: 'A unified knowledge platform where everything is connected. Let\'s take a quick tour.',
      action: null,
    },
    {
      title: 'Knowledge Hub',
      description: 'Search across all content, explore the knowledge graph, and discover connections.',
      action: () => navigate('/knowledge/graph'),
    },
    {
      title: 'Collaborate',
      description: 'Start conversations, make decisions, and schedule meetings - all linked together.',
      action: () => navigate('/conversations'),
    },
    {
      title: 'Execute',
      description: 'Manage projects, track tasks, run sprints, and achieve goals.',
      action: () => navigate('/projects'),
    },
    {
      title: 'AI-Powered Context',
      description: 'Every item shows related content, expert users, and smart suggestions automatically.',
      action: null,
    },
  ];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('onboarding_completed');
    if (!hasSeenTour) {
      setShow(true);
    }
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) {
      if (steps[step].action) steps[step].action();
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${bgPrimary} border ${borderColor} rounded-lg p-8 max-w-md w-full`}>
        <div className="flex justify-between items-start mb-6">
          <div className={`text-sm ${textSecondary}`}>Step {step + 1} of {steps.length}</div>
          <button onClick={handleComplete}>
            <XMarkIcon className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        <h2 className={`text-2xl font-semibold ${textPrimary} mb-3`}>{steps[step].title}</h2>
        <p className={`text-base ${textSecondary} mb-8`}>{steps[step].description}</p>

        <div className="flex gap-3">
          <button
            onClick={handleComplete}
            className={`px-4 py-2 border ${borderColor} rounded ${textSecondary} hover:bg-opacity-50`}
          >
            Skip Tour
          </button>
          <button
            onClick={handleNext}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${bgPrimary} border-2 ${borderColor} rounded ${textPrimary} hover:bg-opacity-80`}
          >
            {step < steps.length - 1 ? 'Next' : 'Get Started'}
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-blue-500' : 'w-1.5 bg-gray-300 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
