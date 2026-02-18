import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const commands = [
    { name: 'New Issue', action: () => navigate('/issues/create'), icon: '➕' },
    { name: 'Dashboard', action: () => navigate('/dashboard'), icon: '📊' },
    { name: 'Issues', action: () => navigate('/issues'), icon: '📋' },
    { name: 'Conversations', action: () => navigate('/conversations'), icon: '💬' },
    { name: 'Sprints', action: () => navigate('/sprints'), icon: '🏃' },
    { name: 'Settings', action: () => navigate('/settings'), icon: '⚙️' },
    { name: 'Knowledge Base', action: () => navigate('/knowledge'), icon: '📚' },
  ];

  const filtered = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }

      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelected(s => (s + 1) % filtered.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelected(s => (s - 1 + filtered.length) % filtered.length);
        }
        if (e.key === 'Enter' && filtered[selected]) {
          e.preventDefault();
          filtered[selected].action();
          setIsOpen(false);
          setSearch('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selected]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-lg outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No results found</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={i}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  i === selected ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">{cmd.icon}</span>
                <span className="font-semibold text-gray-900">{cmd.name}</span>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center justify-between">
          <div className="flex gap-4">
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">↑↓</kbd> Navigate</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Enter</kbd> Select</span>
            <span><kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
