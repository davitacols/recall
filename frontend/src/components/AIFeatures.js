import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What issues are blocking our sprint?",
    "Summarize recent decisions",
    "Show me high priority bugs",
    "Create a retrospective report"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/agile/ai/chat/', { message: input });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response, actions: response.data.actions }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        style={{ zIndex: 9999 }}
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6 text-white" />
        ) : (
          <SparklesIcon className="w-6 h-6 text-white animate-pulse" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-stone-900 rounded-2xl shadow-2xl flex flex-col border border-stone-700" style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="p-4 border-b border-stone-800 bg-stone-900 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-100">Recall</h3>
                <p className="text-xs text-stone-500">AI Assistant</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-950">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <LightBulbIcon className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                <p className="text-sm text-stone-400 mb-4">Try asking me:</p>
                <div className="space-y-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-stone-800 text-stone-100'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.actions && (
                    <div className="mt-2 space-y-1">
                      {msg.actions.map((action, j) => (
                        <button
                          key={j}
                          onClick={() => window.location.href = action.url}
                          className="block w-full text-left px-3 py-2 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-stone-800 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-stone-700 bg-stone-900">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition-all"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const SmartSuggestions = ({ context, onApply }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, [context]);

  const loadSuggestions = async () => {
    try {
      const response = await api.post('/api/agile/ai/suggestions/', { context });
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (suggestions.length === 0) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-5 h-5 text-purple-600" />
        <h4 className="font-semibold text-gray-900">AI Suggestions</h4>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
              <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
            </div>
            <button
              onClick={() => onApply?.(suggestion)}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AutoCategorize = ({ text, onCategorize }) => {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    if (text && text.length > 20) {
      const timer = setTimeout(() => categorize(), 1000);
      return () => clearTimeout(timer);
    }
  }, [text]);

  const categorize = async () => {
    try {
      const response = await api.post('/api/agile/ai/categorize/', { text });
      setCategories(response.data);
      onCategorize?.(response.data);
    } catch (error) {
      console.error('Failed to categorize:', error);
    }
  };

  if (!categories) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <SparklesIcon className="w-4 h-4 text-purple-600" />
      <span className="text-gray-600">AI detected:</span>
      {categories.priority && (
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
          {categories.priority} priority
        </span>
      )}
      {categories.type && (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          {categories.type}
        </span>
      )}
      {categories.labels?.map((label, i) => (
        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
          {label}
        </span>
      ))}
    </div>
  );
};
