import React, { useState, useRef, useEffect } from 'react';

export function MentionInput({ value, onChange, placeholder, rows = 3, darkMode = false }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef(null);

  const bgColor = darkMode ? '#292524' : '#ffffff';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const borderColor = darkMode ? '#44403c' : '#d1d5db';
  const hoverBg = darkMode ? '#44403c' : '#f3f4f6';
  const selectedBg = darkMode ? '#57534e' : '#e5e7eb';

  useEffect(() => {
    if (mentionQuery) {
      fetchUsers(mentionQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [mentionQuery]);

  const fetchUsers = async (query) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/conversations/users/?search=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);

    // Check for @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery('');
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${user.username} ` + textAfterCursor;
    
    onChange(newText);
    setShowSuggestions(false);
    setMentionQuery('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current.focus();
      const newCursorPos = lastAtIndex + user.username.length + 2;
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          outline: 'none',
          resize: 'none'
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          marginBottom: '4px',
          left: 0,
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxHeight: '192px',
          overflowY: 'auto',
          zIndex: 10,
          width: '256px'
        }}>
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                backgroundColor: index === selectedIndex ? selectedBg : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index === selectedIndex ? selectedBg : 'transparent'}
            >
              <div style={{ fontWeight: 500, color: textColor }}>@{user.username}</div>
              <div style={{ fontSize: '13px', color: darkMode ? '#a8a29e' : '#6b7280' }}>{user.full_name}</div>
            </button>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: '4px', fontSize: '12px', color: darkMode ? '#a8a29e' : '#6b7280' }}>
        Type @ to mention someone
      </div>
    </div>
  );
}
