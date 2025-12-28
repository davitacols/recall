import React, { useState, useEffect, useRef } from 'react';

const MentionTagInput = ({ value, onChange, placeholder, rows = 4 }) => {
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
      const response = await fetch('http://localhost:8000/api/conversations/users/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const users = await response.json();
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const fetchTags = async (query) => {
    try {
      const response = await fetch('http://localhost:8000/api/conversations/tags/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const tags = await response.json();
      const filtered = tags.filter(t => 
        t.name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Failed to fetch tags');
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
        className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-gray-600 font-mono text-sm resize-none"
      />

      {showSuggestions && (
        <div className="absolute z-50 bg-white border-2 border-black shadow-lg mt-1 max-h-48 overflow-y-auto w-full">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => insertSuggestion(suggestion)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-black text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              <span className="font-bold uppercase tracking-wide">
                {suggestionType === 'mention' ? '@' : '#'}
                {suggestionType === 'mention' ? (suggestion.full_name || suggestion.username) : suggestion.name}
              </span>
              {suggestionType === 'mention' && suggestion.username && (
                <span className="ml-2 text-xs text-gray-500">
                  @{suggestion.username.split('@')[0]}
                </span>
              )}
              {suggestionType === 'tag' && (
                <span className="ml-2 text-xs text-gray-500">
                  {suggestion.usage_count} uses
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 font-bold tracking-wide">
        TYPE @ TO MENTION USERS • TYPE # TO ADD TAGS
      </div>
    </div>
  );
};

export default MentionTagInput;
