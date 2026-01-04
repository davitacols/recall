import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AutomationManagement() {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedRule, setExpandedRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'issue_created',
    trigger_conditions: {},
    actions: [{ type: 'send_notification', config: {} }]
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/automation/rules/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/automation/templates/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const createRule = async () => {
    try {
      const response = await fetch('/api/automation/rules/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchRules();
        setShowCreateForm(false);
        setFormData({
          name: '',
          trigger_type: 'issue_created',
          trigger_conditions: {},
          actions: [{ type: 'send_notification', config: {} }]
        });
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const activateRule = async (ruleId) => {
    try {
      const response = await fetch(`/api/automation/rules/${ruleId}/activate/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to activate rule:', error);
    }
  };

  const pauseRule = async (ruleId) => {
    try {
      const response = await fetch(`/api/automation/rules/${ruleId}/pause/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to pause rule:', error);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('Delete this automation rule?')) return;

    try {
      const response = await fetch(`/api/automation/rules/${ruleId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const createFromTemplate = async (templateId) => {
    try {
      const response = await fetch(`/api/automation/templates/${templateId}/create/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: `Rule from template` })
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to create from template:', error);
    }
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { type: 'send_notification', config: {} }]
    });
  };

  const updateAction = (idx, field, value) => {
    const newActions = [...formData.actions];
    newActions[idx][field] = value;
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (idx) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Automation</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          New Rule
        </button>
      </div>

      {showCreateForm && (
        <div className="border rounded-lg p-6 mb-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Create Automation Rule</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., Auto-assign high priority issues"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trigger</label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({...formData, trigger_type: e.target.value})}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="issue_created">Issue Created</option>
                <option value="issue_updated">Issue Updated</option>
                <option value="issue_assigned">Issue Assigned</option>
                <option value="decision_created">Decision Created</option>
                <option value="decision_locked">Decision Locked</option>
                <option value="sprint_started">Sprint Started</option>
                <option value="sprint_ended">Sprint Ended</option>
                <option value="comment_added">Comment Added</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Actions</label>
              <div className="space-y-2">
                {formData.actions.map((action, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(idx, 'type', e.target.value)}
                      className="border rounded px-3 py-2 flex-1"
                    >
                      <option value="assign_issue">Assign Issue</option>
                      <option value="change_status">Change Status</option>
                      <option value="add_label">Add Label</option>
                      <option value="send_notification">Send Notification</option>
                      <option value="create_comment">Create Comment</option>
                      <option value="move_to_sprint">Move to Sprint</option>
                      <option value="lock_decision">Lock Decision</option>
                      <option value="create_issue">Create Issue</option>
                      <option value="webhook">Webhook</option>
                    </select>
                    <button
                      onClick={() => removeAction(idx)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addAction}
                className="mt-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                + Add Action
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createRule}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Rule
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Rules</h3>
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className="border rounded-lg p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                >
                  <div className="flex-1">
                    <div className="font-semibold">{rule.name}</div>
                    <div className="text-sm text-gray-600">{rule.trigger_type}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {rule.status}
                    </span>
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform ${expandedRule === rule.id ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {expandedRule === rule.id && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {rule.status === 'draft' && (
                      <button
                        onClick={() => activateRule(rule.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Activate
                      </button>
                    )}
                    {rule.status === 'active' && (
                      <button
                        onClick={() => pauseRule(rule.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 w-full"
                      >
                        <PauseIcon className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-full"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Templates</h3>
          <div className="space-y-2">
            {templates.map(template => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="font-semibold">{template.name}</div>
                <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                <button
                  onClick={() => createFromTemplate(template.id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
