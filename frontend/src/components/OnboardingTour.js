import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../utils/ThemeAndAccessibility';

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();

  const bgPrimary = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  // One step, not five. The previous tour walked through Knowledge Hub /
  // Collaborate / Execute — the "unified platform" pitch the marketing site no
  // longer makes. It also never mentioned GitHub, so someone who signed up on
  // the promise of "connect GitHub in a minute" arrived and was told about
  // sprints instead. A tour is not a feature list; it should point at the one
  // action worth taking first.
  const steps = [
    {
      title: 'Connect a repository',
      description:
        'Knoledgr records the decisions your team makes and links them to the pull requests that implemented them. Connect one repo and it starts building that history from the work you are already doing — nothing to migrate, and nobody has to change how they work.',
      cta: 'Connect GitHub',
      to: '/integrations/github',
    },
  ];

  useEffect(() => {
    if (!user) {
      setShow(false);
      return;
    }
    const hasSeenTour = localStorage.getItem('onboarding_completed');
    if (!hasSeenTour && !user.onboarding_completed) {
      // Delay showing tour so it doesn't block initial render
      const timer = setTimeout(() => {
        setShow(true);
        setStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [user]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    // Land the user on the action rather than dumping them back on an empty
    // dashboard — the whole point of the step is that they do the thing.
    const destination = steps[step]?.to;
    localStorage.setItem('onboarding_completed', 'true');
    setShow(false);
    navigate(destination || (user ? '/dashboard' : '/'), { replace: true });
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShow(false);
    navigate(user ? '/dashboard' : '/', { replace: true });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className={`${bgPrimary} border ${borderColor} rounded-lg p-8 max-w-md w-full`}>
        <div className="flex justify-between items-start mb-6">
          {steps.length > 1 ? (
            <div className={`text-sm ${textSecondary}`}>Step {step + 1} of {steps.length}</div>
          ) : (
            <div className={`text-sm ${textSecondary}`}>Getting started</div>
          )}
          <button onClick={handleComplete} aria-label="Dismiss">
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
            Later
          </button>
          <button
            onClick={handleNext}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${bgPrimary} border-2 ${borderColor} rounded ${textPrimary} hover:bg-opacity-80`}
          >
            {steps[step].cta || (step < steps.length - 1 ? 'Next' : 'Get Started')}
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
