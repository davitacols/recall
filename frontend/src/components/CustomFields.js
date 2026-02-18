import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export const CustomFieldsManager = ({ projectId }) => {
  const [fields, setFields] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text',
    options: [],
    required: false
  });

  useEffect(() => {
    loadFields();
  }, [projectId]);

  const loadFields = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/custom-fields/`);
      setFields(response.data);
    } catch (error) {
      console.error('Failed to load custom fields:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/agile/projects/${projectId}/custom-fields/`, formData);
      setFormData({ name: '', field_type: 'text', options: [], required: false });
      setShowForm(false);
      loadFields();
    } catch (error) {
      console.error('Failed to create field:', error);
    }
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm('Delete this field?')) return;
    try {
      await api.delete(`/api/agile/custom-fields/${fieldId}/`);
      loadFields();
    } catch (error) {
      console.error('Failed to delete field:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Custom Fields</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
            <select
              value={formData.field_type}
              onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown</option>
              <option value="multiselect">Multi-select</option>
            </select>
          </div>
          {(formData.field_type === 'dropdown' || formData.field_type === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma-separated)</label>
              <input
                type="text"
                placeholder="Option1, Option2, Option3"
                onChange={(e) => setFormData({ ...formData, options: e.target.value.split(',').map(o => o.trim()) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Required field</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Create Field
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{field.name}</div>
              <div className="text-sm text-gray-500">
                {field.field_type} {field.required && '• Required'}
              </div>
            </div>
            <button
              onClick={() => handleDelete(field.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CustomIssueTypesManager = ({ projectId }) => {
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', icon: '📋', color: '#6B7280' });

  useEffect(() => {
    loadTypes();
  }, [projectId]);

  const loadTypes = async () => {
    try {
      const response = await api.get(`/api/agile/projects/${projectId}/issue-types/`);
      setTypes(response.data);
    } catch (error) {
      console.error('Failed to load issue types:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/agile/projects/${projectId}/issue-types/`, formData);
      setFormData({ name: '', icon: '📋', color: '#6B7280' });
      setShowForm(false);
      loadTypes();
    } catch (error) {
      console.error('Failed to create type:', error);
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Delete this issue type?')) return;
    try {
      await api.delete(`/api/agile/issue-types/${typeId}/`);
      loadTypes();
    } catch (error) {
      console.error('Failed to delete type:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Custom Issue Types</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
        >
          <PlusIcon className="w-4 h-4" />
          Add Type
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Create Type
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {types.map((type) => (
          <div key={type.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{type.name}</div>
                <div className="w-16 h-4 rounded" style={{ backgroundColor: type.color }}></div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(type.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
