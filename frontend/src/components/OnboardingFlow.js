import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const OnboardingFlow = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [userData, setUserData] = useState({ role: '', team_size: '', use_case: '' });
  const navigate = useNavigate();

  const steps = [
    {
      title: 'Welcome to Recall',
      description: 'Project management and decision tracking for modern teams',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600 text-lg">Track conversations, make decisions, and manage sprints in one place.</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <div className="text-sm font-medium text-gray-900 mb-1">Conversations</div>
              <div className="text-xs text-gray-500">Capture discussions</div>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <div className="text-sm font-medium text-gray-900 mb-1">Decisions</div>
              <div className="text-xs text-gray-500">Track outcomes</div>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <div className="text-sm font-medium text-gray-900 mb-1">Sprints</div>
              <div className="text-xs text-gray-500">Manage work</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Tell us about yourself',
      description: 'This helps us customize your experience',
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your role</label>
            <select
              value={userData.role}
              onChange={(e) => setUserData({...userData, role: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select your role</option>
              <option value="developer">Developer</option>
              <option value="manager">Manager</option>
              <option value="product">Product Manager</option>
              <option value="designer">Designer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team size</label>
            <select
              value={userData.team_size}
              onChange={(e) => setUserData({...userData, team_size: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select team size</option>
              <option value="1-5">1-5 people</option>
              <option value="6-20">6-20 people</option>
              <option value="21-50">21-50 people</option>
              <option value="50+">50+ people</option>
            </select>
          </div>
        </div>
      )
    },
    {
      title: 'Create your first project',
      description: 'Projects organize your team\'s work',
      content: (
        <div className="space-y-4">
          <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Start</h3>
            <p className="text-sm text-gray-600 mb-4">Create a sample project with demo data to explore features.</p>
            <button
              onClick={() => createSampleProject()}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Create Sample Project
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          <button
            onClick={() => { handleComplete(); navigate('/projects'); }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Create Custom Project
          </button>
        </div>
      )
    },
    {
      title: 'Keyboard shortcuts',
      description: 'Navigate faster with keyboard commands',
      content: (
        <div className="space-y-2.5">
          {[
            { keys: ['⌘', 'K'], action: 'Quick search' },
            { keys: ['⌘', 'N'], action: 'New issue' },
            { keys: ['G', 'D'], action: 'Dashboard' },
            { keys: ['G', 'I'], action: 'Issues' },
          ].map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-700">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd key={j} className="px-2.5 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'You\'re ready to go',
      description: 'Start managing your projects',
      content: (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircleIcon className="w-10 h-10 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup complete</h3>
            <p className="text-gray-600">You can now start using Recall</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { handleComplete(); navigate('/dashboard'); }}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { handleComplete(); navigate('/conversations/new'); }}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              New Conversation
            </button>
          </div>
        </div>
      )
    }
  ];

  const createSampleProject = async () => {
    try {
      await api.post('/api/agile/projects/', {
        name: 'Sample Project',
        key: 'SAMPLE',
        description: 'A demo project to explore Recall features'
      });
      setStep(step + 1);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete?.();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-[9999] p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">{steps[step].title}</h2>
          <p className="text-sm text-gray-500 mb-6">{steps[step].description}</p>
          {steps[step].content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Back
          </button>
          <div className="text-xs text-gray-400">
            {step + 1} of {steps.length}
          </div>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => { handleComplete(); navigate('/dashboard'); }}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Get Started
            </button>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && (
          <div className="text-center mt-4">
            <button
              onClick={() => { handleComplete(); navigate('/dashboard'); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
