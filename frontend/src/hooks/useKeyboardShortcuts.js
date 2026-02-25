import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Keyboard shortcuts hook
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      // Cmd/Ctrl + K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        e.preventDefault();
        setShowCommandPalette(true);
      }

      // Cmd/Ctrl + N - New conversation
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/conversations');
      }

      // Cmd/Ctrl + / - Show shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        alert('Keyboard Shortcuts:\n\n⌘K - Search\n⌘N - New Conversation\n⌘1 - Dashboard\n⌘2 - Conversations\n⌘3 - Decisions\n⌘4 - Knowledge');
      }

      // Cmd/Ctrl + 1-4 - Navigation
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const routes = ['/', '/conversations', '/decisions', '/knowledge'];
        navigate(routes[parseInt(e.key) - 1]);
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return { showCommandPalette, setShowCommandPalette };
};

// Command Palette Component
export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands = [
    { name: 'Dashboard', icon: '🏠', action: () => navigate('/'), keywords: ['home', 'dashboard'] },
    { name: 'New Conversation', icon: '✍️', action: () => navigate('/conversations'), keywords: ['create', 'new', 'conversation'] },
    { name: 'View Conversations', icon: '💬', action: () => navigate('/conversations'), keywords: ['conversations', 'posts'] },
    { name: 'View Decisions', icon: '✅', action: () => navigate('/decisions'), keywords: ['decisions', 'log'] },
    { name: 'Search Knowledge', icon: '🔍', action: () => navigate('/knowledge'), keywords: ['search', 'knowledge', 'find'] },
    { name: 'Activity Feed', icon: '📊', action: () => navigate('/activity'), keywords: ['activity', 'feed', 'timeline'] },
  ];

  const filteredCommands = query
    ? commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.keywords.some(k => k.includes(query.toLowerCase()))
      )
    : commands;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Search Input */}
        <div className="border-b-2 border-gray-200 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-lg border-2 border-gray-300 focus:border-gray-900 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="font-bold uppercase tracking-wide">No commands found</p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={index}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`w-full text-left px-6 py-4 flex items-center space-x-4 transition-colors ${
                  index === selectedIndex
                    ? 'bg-gray-900 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl">{cmd.icon}</span>
                <span className="font-bold uppercase tracking-wide">{cmd.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span className="font-bold uppercase tracking-wide">↑↓ Navigate</span>
              <span className="font-bold uppercase tracking-wide">↵ Select</span>
              <span className="font-bold uppercase tracking-wide">ESC Close</span>
            </div>
            <span className="font-bold uppercase tracking-wide">⌘K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keyboard shortcuts help modal
export const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['⌘', 'N'], description: 'New conversation' },
    { keys: ['⌘', '1'], description: 'Go to Dashboard' },
    { keys: ['⌘', '2'], description: 'Go to Conversations' },
    { keys: ['⌘', '3'], description: 'Go to Decisions' },
    { keys: ['⌘', '4'], description: 'Go to Knowledge' },
    { keys: ['⌘', '/'], description: 'Show this help' },
    { keys: ['ESC'], description: 'Close modals' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-900">
          <h2 className="text-2xl font-bold uppercase tracking-wide">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
              <span className="text-gray-700">{shortcut.description}</span>
              <div className="flex items-center space-x-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide">
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Press <span className="font-bold">⌘ /</span> anytime to see this help
          </p>
        </div>
      </div>
    </div>
  );
};
