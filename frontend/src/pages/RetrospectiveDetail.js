import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircleIcon, ExclamationIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

function Retrospectives() {
  const { sprintId } = useParams();
  const [retrospective, setRetrospective] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    what_went_well: [],
    what_needs_improvement: [],
    action_items: []
  });
  const [newItem, setNewItem] = useState({ section: 'what_went_well', text: '' });

  useEffect(() => {
    fetchData();
  }, [sprintId]);

  const fetchData = async () => {
    try {
      const [sprintRes, retroRes] = await Promise.all([
        api.get(`/api/agile/sprints/${sprintId}/detail/`),
        api.get(`/api/agile/sprints/${sprintId}/retrospective/`).catch(() => null)
      ]);
      
      setSprint(sprintRes.data);
      
      if (retroRes) {
        setRetrospective(retroRes.data);
        setFormData({
          what_went_well: retroRes.data.what_went_well || [],
          what_needs_improvement: retroRes.data.what_needs_improvement || [],
          action_items: retroRes.data.action_items || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.text.trim()) return;
    
    setFormData({
      ...formData,
      [newItem.section]: [...formData[newItem.section], newItem.text]
    });
    setNewItem({ section: 'what_went_well', text: '' });
  };

  const handleRemoveItem = (section, index) => {
    setFormData({
      ...formData,
      [section]: formData[section].filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      await api.post(`/api/agile/sprints/${sprintId}/retrospective/`, formData);
      setEditing(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save retrospective:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-20">
        <h2 className="text-4xl font-black text-gray-900 mb-4">Sprint not found</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-gray-900 mb-3">{sprint.name} Retrospective</h1>
          <p className="text-lg text-gray-600 font-light">
            {sprint.start_date} to {sprint.end_date}
          </p>
        </div>

        {/* Sprint Summary */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-green-600 mb-2">{sprint.completed}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Completed</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-amber-600 mb-2">{sprint.in_progress}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">In Progress</p>
          </div>
          <div className="p-6 bg-white border border-gray-200 text-center">
            <p className="text-3xl font-black text-gray-600 mb-2">{sprint.todo}</p>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">To Do</p>
          </div>
        </div>

        {/* Retrospective Sections */}
        <div className="space-y-12">
          {/* What Went Well */}
          <div className="p-8 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">What Went Well</h2>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem.section === 'what_went_well' ? newItem.text : ''}
                    onChange={(e) => setNewItem({ section: 'what_went_well', text: e.target.value })}
                    placeholder="Add positive feedback..."
                    className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                  <button
                    onClick={() => {
                      setNewItem({ section: 'what_went_well', text: '' });
                      handleAddItem();
                    }}
                    className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.what_went_well.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-green-50 border border-green-200">
                      <span>{item}</span>
                      <button
                        onClick={() => handleRemoveItem('what_went_well', idx)}
                        className="text-red-600 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.what_went_well.length === 0 ? (
                  <p className="text-gray-600 italic">No items added yet</p>
                ) : (
                  formData.what_went_well.map((item, idx) => (
                    <div key={idx} className="p-3 bg-green-50 border border-green-200">
                      {item}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* What Needs Improvement */}
          <div className="p-8 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <ExclamationIcon className="w-6 h-6 text-amber-600" />
              <h2 className="text-2xl font-bold text-gray-900">What Needs Improvement</h2>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem.section === 'what_needs_improvement' ? newItem.text : ''}
                    onChange={(e) => setNewItem({ section: 'what_needs_improvement', text: e.target.value })}
                    placeholder="Add improvement area..."
                    className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                  <button
                    onClick={() => {
                      setNewItem({ section: 'what_needs_improvement', text: '' });
                      handleAddItem();
                    }}
                    className="px-6 py-3 bg-amber-600 text-white hover:bg-amber-700 font-bold uppercase text-sm transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.what_needs_improvement.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-amber-50 border border-amber-200">
                      <span>{item}</span>
                      <button
                        onClick={() => handleRemoveItem('what_needs_improvement', idx)}
                        className="text-red-600 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.what_needs_improvement.length === 0 ? (
                  <p className="text-gray-600 italic">No items added yet</p>
                ) : (
                  formData.what_needs_improvement.map((item, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 border border-amber-200">
                      {item}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="p-8 bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <LightBulbIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Action Items</h2>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem.section === 'action_items' ? newItem.text : ''}
                    onChange={(e) => setNewItem({ section: 'action_items', text: e.target.value })}
                    placeholder="Add action item..."
                    className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all"
                  />
                  <button
                    onClick={() => {
                      setNewItem({ section: 'action_items', text: '' });
                      handleAddItem();
                    }}
                    className="px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 font-bold uppercase text-sm transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.action_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-purple-50 border border-purple-200">
                      <span>{item}</span>
                      <button
                        onClick={() => handleRemoveItem('action_items', idx)}
                        className="text-red-600 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.action_items.length === 0 ? (
                  <p className="text-gray-600 italic">No items added yet</p>
                ) : (
                  formData.action_items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 border border-purple-200">
                      {item}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-12">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-8 py-4 bg-gray-900 text-white hover:bg-black font-bold uppercase text-sm transition-all"
            >
              Edit Retrospective
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-8 py-4 bg-green-600 text-white hover:bg-green-700 font-bold uppercase text-sm transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  fetchData();
                }}
                className="px-8 py-4 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold uppercase text-sm transition-all"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Retrospectives;
