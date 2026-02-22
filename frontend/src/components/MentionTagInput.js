import React, { useState, useEffect, useRef } from 'react';

const MentionTagInput = ({ value, onChange, placeholder, rows = 4, darkMode = false }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionType, setSuggestionType] = useState(null); // 'mention' or 'tag'
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = value.substring(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');
    const lastHashIndex = text.lastIndexOf('#');
    const lastSpaceIndex = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));

    // Check for @mention
    if (lastAtIndex > lastSpaceIndex && lastAtIndex !== -1) {
      const query = text.substring(lastAtIndex + 1);
      if (query.length > 0 && !query.includes(' ')) {
        fetchUsers(query);
        setSuggestionType('mention');
        return;
      }
    }

    // Check for #tag
    if (lastHashIndex > lastSpaceIndex && lastHashIndex !== -1) {
      const query = text.substring(lastHashIndex + 1);
      if (query.length > 0 && !query.includes(' ')) {
        fetchTags(query);
        setSuggestionType('tag');
        return;
      }
    }

    setShowSuggestions(false);
  }, [value, cursorPosition]);

  const fetchUsers = async (query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/conversations/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = await response.json();
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(query.toLowerCase()))
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchTags = async (query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/conversations/tags/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tags = await response.json();
      const filtered = tags.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const insertSuggestion = (suggestion) => {
    const textarea = textareaRef.current;
    const text = value.substring(0, cursorPosition);
    const prefix = suggestionType === 'mention' ? '@' : '#';
    const lastIndex = text.lastIndexOf(prefix);
    
    // For mentions, use full_name if available, otherwise username without @domain
    let insertText;
    if (suggestionType === 'mention') {
      insertText = suggestion.full_name || suggestion.username.split('@')[0];
    } else {
      insertText = suggestion.name;
    }
    
    const newValue = 
      value.substring(0, lastIndex + 1) + 
      insertText + 
      ' ' + 
      value.substring(cursorPosition);
    
    onChange({ target: { value: newValue } });
    setShowSuggestions(false);
    
    setTimeout(() => {
      const newPos = lastIndex + 1 + insertText.length + 1;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[selectedIndex]) {
        e.preventDefault();
        insertSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleChange = (e) => {
    onChange(e);
    setCursorPosition(e.target.selectionStart);
  };

  const highlightText = (text) => {
    return text
      .replace(/@(\w+)/g, '<span class="text-blue-600 font-bold">@$1</span>')
      .replace(/#(\w+)/g, '<span class="text-black font-bold">#$1</span>');
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => setCursorPosition(e.target.selectionStart)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: darkMode ? '#292524' : '#ffffff',
          color: darkMode ? '#e7e5e4' : '#111827',
          border: `2px solid ${darkMode ? '#44403c' : '#111827'}`,
          borderRadius: '4px',
          fontSize: '14px',
          outline: 'none',
          resize: 'none',
          fontFamily: 'monospace'
        }}
      />

      {showSuggestions && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          backgroundColor: darkMode ? '#292524' : '#ffffff',
          border: `2px solid ${darkMode ? '#44403c' : '#111827'}`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          marginTop: '4px',
          maxHeight: '192px',
          overflowY: 'auto',
          width: '100%'
        }}>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => insertSuggestion(suggestion)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                fontSize: '14px',
                transition: 'all 0.2s',
                backgroundColor: index === selectedIndex ? (darkMode ? '#44403c' : '#111827') : 'transparent',
                color: index === selectedIndex ? '#ffffff' : (darkMode ? '#e7e5e4' : '#111827'),
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {suggestionType === 'mention' ? '@' : '#'}
                {suggestionType === 'mention' ? (suggestion.full_name || suggestion.username) : suggestion.name}
              </span>
              {suggestionType === 'mention' && suggestion.username && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: darkMode ? '#a8a29e' : '#6b7280' }}>
                  @{suggestion.username.split('@')[0]}
                </span>
              )}
              {suggestionType === 'tag' && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: darkMode ? '#a8a29e' : '#6b7280' }}>
                  {suggestion.usage_count} uses
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '12px', color: darkMode ? '#a8a29e' : '#6b7280', fontWeight: 700, letterSpacing: '0.05em' }}>
        TYPE @ TO MENTION USERS • TYPE # TO ADD TAGS
      </div>
    </div>
  );
};

export default MentionTagInput;
