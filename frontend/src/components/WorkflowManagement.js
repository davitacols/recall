import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function WorkflowManagement() {
  const [workflows, setWorkflows] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    workflow_type: 'decision_approval',
    stages: [{ name: 'Review', required_role: 'manager' }],
    approver_ids: []
  });
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    fetchWorkflows();
    fetchTeamMembers();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team/members/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  };

  const createWorkflow = async () => {
    try {
      const response = await fetch('/api/workflows/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchWorkflows();
        setShowCreateForm(false);
        setFormData({
          name: '',
          workflow_type: 'decision_approval',
          stages: [{ name: 'Review', required_role: 'manager' }],
          approver_ids: []
        });
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const activateWorkflow = async (workflowId) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/activate/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error('Failed to activate workflow:', error);
    }
  };

  const addStage = () => {
    setFormData({
      ...formData,
      stages: [...formData.stages, { name: '', required_role: 'manager' }]
    });
  };

  const updateStage = (idx, field, value) => {
    const newStages = [...formData.stages];
    newStages[idx][field] = value;
    setFormData({ ...formData, stages: newStages });
  };

  const removeStage = (idx) => {
    setFormData({
      ...formData,
      stages: formData.stages.filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Team Workflows</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          New Workflow
        </button>
      </div>

      {showCreateForm && (
        <div className="border rounded-lg p-6 mb-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Create Workflow</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Workflow Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border rounded px-3 py-2 w-full"
                placeholder="e.g., Decision Approval Process"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.workflow_type}
                onChange={(e) => setFormData({...formData, workflow_type: e.target.value})}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="decision_approval">Decision Approval</option>
                <option value="issue_resolution">Issue Resolution</option>
                <option value="sprint_planning">Sprint Planning</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stages</label>
              <div className="space-y-2">
                {formData.stages.map((stage, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => updateStage(idx, 'name', e.target.value)}
                      placeholder="Stage name"
                      className="border rounded px-3 py-2 flex-1"
                    />
                    <select
                      value={stage.required_role}
                      onChange={(e) => updateStage(idx, 'required_role', e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="contributor">Contributor</option>
                    </select>
                    <button
                      onClick={() => removeStage(idx)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addStage}
                className="mt-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                + Add Stage
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Approvers</label>
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <label key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.approver_ids.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            approver_ids: [...formData.approver_ids, member.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            approver_ids: formData.approver_ids.filter(id => id !== member.id)
                          });
                        }
                      }}
                    />
                    {member.full_name || member.username}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={createWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Workflow
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

      <div className="space-y-2">
        {workflows.map(workflow => (
          <div key={workflow.id} className="border rounded-lg p-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedWorkflow(expandedWorkflow === workflow.id ? null : workflow.id)}
            >
              <div className="flex-1">
                <div className="font-semibold">{workflow.name}</div>
                <div className="text-sm text-gray-600">{workflow.workflow_type}</div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {workflow.status}
                </span>
                <ChevronDownIcon
                  className={`w-5 h-5 transition-transform ${expandedWorkflow === workflow.id ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {expandedWorkflow === workflow.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Stages:</div>
                  <div className="space-y-1">
                    {workflow.stages && workflow.stages.map((stage, idx) => (
                      <div key={idx} className="text-sm bg-gray-100 px-3 py-2 rounded">
                        {idx + 1}. {stage.name} ({stage.required_role})
                      </div>
                    ))}
                  </div>
                </div>

                {workflow.status === 'draft' && (
                  <button
                    onClick={() => activateWorkflow(workflow.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Activate Workflow
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
