import React, { useState } from 'react';
import { useToast } from './Toast';
import { TrashIcon, ArchiveBoxIcon, CheckIcon } from '@heroicons/react/24/outline';


export function BulkActions({ selectedIds, onComplete, type = 'conversations' }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} items?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'conversations' ? 'conversations/delete' :
                      type === 'documents' ? 'documents/delete' : 'conversations/delete';
      
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/organizations/bulk/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      const data = await res.json();
      success(data.message || `Deleted ${selectedIds.length} items`);
      onComplete();
    } catch (err) {
      error('Failed to delete items');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/organizations/bulk/conversations/archive/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      const data = await res.json();
      success(data.message || `Archived ${selectedIds.length} items`);
      onComplete();
    } catch (err) {
      error('Failed to archive items');
    } finally {
      setLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 z-50">
      <span className="font-medium">{selectedIds.length} selected</span>
      
      {type === 'conversations' && (
        <button
          onClick={handleBulkArchive}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50"
        >
          <ArchiveBoxIcon className="w-4 h-4" />
          Archive
        </button>
      )}
      
      <button
        onClick={handleBulkDelete}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition disabled:opacity-50"
      >
        <TrashIcon className="w-4 h-4" />
        Delete
      </button>
      
      <button
        onClick={() => onComplete()}
        className="ml-2 text-gray-400 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}

export function SelectableList({ items, renderItem, onSelectionChange }) {
  const [selected, setSelected] = useState([]);

  const toggleSelect = (id) => {
    const newSelected = selected.includes(id)
      ? selected.filter(i => i !== id)
      : [...selected, id];
    setSelected(newSelected);
    onSelectionChange(newSelected);
  };

  const toggleSelectAll = () => {
    const newSelected = selected.length === items.length ? [] : items.map(i => i.id);
    setSelected(newSelected);
    onSelectionChange(newSelected);
  };

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.length === items.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Select all</span>
        </div>
      )}
      
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 mb-2">
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            onChange={() => toggleSelect(item.id)}
            className="mt-1 w-4 h-4 rounded border-gray-300"
          />
          <div className="flex-1">
            {renderItem(item)}
          </div>
        </div>
      ))}
    </div>
  );
}


