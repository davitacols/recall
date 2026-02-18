import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useToast } from './Toast';

export const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', events: [] });
  const { addToast } = useToast();

  const events = [
    'issue.created', 'issue.updated', 'issue.deleted',
    'sprint.started', 'sprint.completed',
    'decision.made', 'conversation.created'
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await api.get('/api/integrations/webhooks/');
      setWebhooks(response.data);
    } catch (error) {
      addToast('Failed to load webhooks', 'error');
    }
  };

  const createWebhook = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/integrations/webhooks/', formData);
      addToast('Webhook created', 'success');
      setWebhooks([...webhooks, response.data]);
      setShowForm(false);
      setFormData({ name: '', url: '', events: [] });
    } catch (error) {
      addToast('Failed to create webhook', 'error');
    }
  };

  const deleteWebhook = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.delete(`/api/integrations/webhooks/${id}/`);
      setWebhooks(webhooks.filter(w => w.id !== id));
      addToast('Webhook deleted', 'success');
    } catch (error) {
      addToast('Failed to delete webhook', 'error');
    }
  };

  const testWebhook = async (id) => {
    try {
      await api.post(`/api/integrations/webhooks/${id}/test/`);
      addToast('Test sent', 'success');
    } catch (error) {
      addToast('Test failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold"
        >
          <PlusIcon className="w-5 h-5" />
          New Webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Create Webhook</h3>
          <form onSubmit={createWebhook} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Webhook URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="https://your-app.com/webhook"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Events</label>
              <div className="grid grid-cols-2 gap-2">
                {events.map(event => (
                  <label key={event} className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, events: [...formData.events, event]});
                        } else {
                          setFormData({...formData, events: formData.events.filter(ev => ev !== event)});
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold">
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {webhooks.map(webhook => (
          <div key={webhook.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{webhook.name}</h3>
                <p className="text-sm text-gray-600 font-mono">{webhook.url}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testWebhook(webhook.id)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold"
                >
                  Test
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {webhook.events.map(event => (
                <span key={event} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {event}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const IntegrationCard = ({ type, title, description, icon, onConnect, connected }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {connected ? (
        <CheckCircleIcon className="w-6 h-6 text-green-600" />
      ) : null}
    </div>
    <button
      onClick={onConnect}
      className={`w-full px-4 py-2 rounded-lg font-semibold ${
        connected
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-gray-900 text-white hover:bg-gray-800'
      }`}
    >
      {connected ? 'Configure' : 'Connect'}
    </button>
  </div>
);
