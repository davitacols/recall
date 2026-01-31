import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function IssueAssignment({ issueId, currentAssignee, teamMembers, onAssignmentChange }) {
  const [assignee, setAssignee] = useState(currentAssignee?.id || null);
  const [loading, setLoading] = useState(false);

  const handleAssign = async (userId) => {
    setLoading(true);
    try {
      const response = await api.put(`/api/agile/issues/${issueId}/`, {
        assignee_id: userId || null
      });
      setAssignee(userId);
      if (onAssignmentChange) {
        onAssignmentChange(response.data);
      }
    } catch (error) {
      console.error('Failed to assign issue:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-900">Assign To</label>
      <select
        value={assignee || ''}
        onChange={(e) => handleAssign(e.target.value ? parseInt(e.target.value) : null)}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {teamMembers?.map(member => (
          <option key={member.id} value={member.id}>
            {member.first_name} {member.last_name}
          </option>
        ))}
      </select>
      {assignee && (
        <div className="text-xs text-gray-600">
          Assigned to {teamMembers?.find(m => m.id === assignee)?.first_name}
        </div>
      )}
    </div>
  );
}
