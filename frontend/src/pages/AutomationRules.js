import React, { useState, useEffect } from 'react';
import { useTheme } from '../utils/ThemeAndAccessibility';
import api from '../services/api';
import { BoltIcon, PlusIcon, TrashIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';

function AutomationRules() {
  const { darkMode } = useTheme();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'issue_created',
    actions: [{ type: 'assign_issue', config: {} }]
  });

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-white';
  const cardBg = darkMode ? 'bg-stone-900' : 'bg-white';
  const borderColor = darkMode ? 'border-stone-800' : 'border-gray-200';
  const textColor = darkMode ? 'text-stone-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-stone-400' : 'text-gray-600';

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get('/api/organizations/automation/rules/');
      setRules(response.data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/organizations/automation/rules/create/', formData);
      setShowCreateModal(false);
      setFormData({ name: '', trigger_type: 'issue_created', actions: [{ type: 'assign_issue', config: {} }] });
      fetchRules();
    } catch (error) {
      alert('Failed to create rule');
    }
  };

  const handleToggle = async (ruleId, currentStatus) => {
    try {
      const endpoint = currentStatus === 'active' ? 'pause' : 'activate';
      await api.post(`/api/organizations/automation/rules/${ruleId}/${endpoint}/`);
      fetchRules();
    } catch (error) {
      alert('Failed to toggle rule');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      await api.delete(`/api/organizations/automation/rules/${ruleId}/delete/`);
      fetchRules();
    } catch (error) {
      alert('Failed to delete rule');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={`w-8 h-8 border-2 ${darkMode ? 'border-stone-700 border-t-stone-400' : 'border-gray-300 border-t-gray-600'} rounded-full animate-spin`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${textColor} mb-2`}>Automation Rules</h1>
            <p className={textSecondary}>Automate your workflows with custom rules</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            Create Rule
          </button>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className={`${cardBg} border ${borderColor} rounded-lg p-12 text-center`}>
              <BoltIcon className={`w-12 h-12 ${textSecondary} mx-auto mb-4`} />
              <p className={textSecondary}>No automation rules yet</p>
            </div>
          ) : (
            rules.map(rule => (
              <div key={rule.id} className={`${cardBg} border ${borderColor} rounded-lg p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-bold ${textColor}`}>{rule.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.status === 'active' ? 'bg-green-100 text-green-800' :
                        rule.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.status}
                      </span>
                    </div>
                    {rule.description && (
                      <p className={`${textSecondary} text-sm mb-3`}>{rule.description}</p>
                    )}
                    <div className={`text-sm ${textSecondary}`}>
                      <span className="font-semibold">Trigger:</span> {rule.trigger_type.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(rule.id, rule.status)}
                      className={`p-2 rounded transition-all ${
                        rule.status === 'active'
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={rule.status === 'active' ? 'Pause' : 'Activate'}
                    >
                      {rule.status === 'active' ? (
                        <PauseIcon className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className={`pt-3 border-t ${borderColor}`}>
                  <div className={`text-xs ${textSecondary}`}>
                    Created {new Date(rule.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${cardBg} border ${borderColor} rounded-lg p-6 w-full max-w-md`}>
              <h2 className={`text-xl font-bold ${textColor} mb-4`}>Create Automation Rule</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Rule Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Auto-assign high priority issues"
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Trigger</label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                    className={`w-full px-3 py-2 border ${borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-stone-800 text-stone-100' : 'bg-white text-gray-900'}`}
                  >
                    <option value="issue_created">Issue Created</option>
                    <option value="issue_updated">Issue Updated</option>
                    <option value="issue_assigned">Issue Assigned</option>
                    <option value="decision_created">Decision Created</option>
                    <option value="sprint_started">Sprint Started</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 border ${borderColor} rounded-lg ${textColor} hover:bg-gray-50 transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Create Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutomationRules;
