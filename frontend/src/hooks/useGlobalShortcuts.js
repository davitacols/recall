import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useGlobalShortcuts = (searchRef) => {
  const navigate = useNavigate();

  const handleKeyPress = useCallback((e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + K - Focus search
    if (modKey && e.key === 'k') {
      e.preventDefault();
      searchRef?.current?.focus();
    }

    // Cmd/Ctrl + N - New issue
    if (modKey && e.key === 'n') {
      e.preventDefault();
      navigate('/issues/create');
    }

    // Cmd/Ctrl + / - Show shortcuts
    if (modKey && e.key === '/') {
      e.preventDefault();
      // Show shortcuts modal
      const event = new CustomEvent('show-shortcuts');
      window.dispatchEvent(event);
    }

    // G then D - Go to dashboard
    if (e.key === 'g') {
      const handleSecondKey = (e2) => {
        if (e2.key === 'd') navigate('/dashboard');
        if (e2.key === 'i') navigate('/issues');
        if (e2.key === 'c') navigate('/conversations');
        if (e2.key === 's') navigate('/sprints');
        document.removeEventListener('keydown', handleSecondKey);
      };
      document.addEventListener('keydown', handleSecondKey);
      setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
    }
  }, [navigate, searchRef]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
};

export const ShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleShow = () => onClose(false);
    window.addEventListener('show-shortcuts', handleShow);
    return () => window.removeEventListener('show-shortcuts', handleShow);
  }, [onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘/Ctrl', 'K'], action: 'Focus search' },
    { keys: ['⌘/Ctrl', 'N'], action: 'New issue' },
    { keys: ['⌘/Ctrl', '/'], action: 'Show shortcuts' },
    { keys: ['G', 'D'], action: 'Go to dashboard' },
    { keys: ['G', 'I'], action: 'Go to issues' },
    { keys: ['G', 'C'], action: 'Go to conversations' },
    { keys: ['G', 'S'], action: 'Go to sprints' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Keyboard Shortcuts</h2>
        <div className="space-y-3">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-gray-700">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd key={j} className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};
