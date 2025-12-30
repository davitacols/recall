import React, { useState, useRef, useEffect } from 'react';
import { useAutoSave } from '../hooks/useAutoSave';
import SaveIndicator from './SaveIndicator';

function InlineEditableText({ 
  value, 
  onSave, 
  multiline = false, 
  placeholder = 'Click to edit',
  className = '',
  displayClassName = ''
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  const { status, triggerSave, getStatusText } = useAutoSave(async (data) => {
    await onSave(data);
    setIsEditing(false);
  }, 2000);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline) {
        inputRef.current.setSelectionRange(editValue.length, editValue.length);
      }
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    triggerSave(newValue);
  };

  const handleBlur = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
    if (!multiline && e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <div>
        {multiline ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full p-3 border border-gray-900 focus:outline-none ${className}`}
            rows={5}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full p-3 border border-gray-900 focus:outline-none ${className}`}
          />
        )}
        <div className="mt-2">
          <SaveIndicator status={status} statusText={getStatusText()} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-gray-50 transition-colors p-2 -m-2 ${displayClassName}`}
      title="Click to edit"
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </div>
  );
}

export default InlineEditableText;
