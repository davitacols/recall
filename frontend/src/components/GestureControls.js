import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight, leftAction, rightAction }) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef(null);

  const handleStart = (e) => {
    setStartX(e.type === 'mousedown' ? e.clientX : e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    setCurrentX(x - startX);
  };

  const handleEnd = () => {
    if (Math.abs(currentX) > 100) {
      if (currentX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    setCurrentX(0);
    setIsDragging(false);
  };

  const opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
  const rotation = currentX / 20;

  return (
    <div className="relative">
      {/* Action Indicators */}
      {currentX > 50 && (
        <div className="absolute inset-0 bg-green-500 rounded-lg flex items-center justify-start px-6 z-0">
          <div className="flex items-center gap-2 text-white">
            <CheckIcon className="w-6 h-6" />
            <span className="font-semibold">{rightAction || 'Complete'}</span>
          </div>
        </div>
      )}
      {currentX < -50 && (
        <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end px-6 z-0">
          <div className="flex items-center gap-2 text-white">
            <span className="font-semibold">{leftAction || 'Delete'}</span>
            <XMarkIcon className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Card */}
      <div
        ref={cardRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          transform: `translateX(${currentX}px) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging ? 'none' : 'transform 0.3s, opacity 0.3s',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          zIndex: 1
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const CommandBar = ({ onCommand }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  const commands = [
    { cmd: 'create issue', desc: 'Create a new issue', action: () => onCommand('create-issue') },
    { cmd: 'new sprint', desc: 'Start a new sprint', action: () => onCommand('new-sprint') },
    { cmd: 'show blockers', desc: 'View all blockers', action: () => onCommand('show-blockers') },
    { cmd: 'my tasks', desc: 'Show my assigned tasks', action: () => onCommand('my-tasks') },
    { cmd: 'goto dashboard', desc: 'Navigate to dashboard', action: () => onCommand('goto-dashboard') }
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (input) {
      const filtered = commands.filter(c => 
        c.cmd.toLowerCase().includes(input.toLowerCase()) ||
        c.desc.toLowerCase().includes(input.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(commands);
    }
  }, [input]);

  const handleSelect = (command) => {
    command.action();
    setIsOpen(false);
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="w-full text-lg border-none focus:ring-0 focus:outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {suggestions.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleSelect(cmd)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <div className="font-medium text-gray-900">{cmd.cmd}</div>
              <div className="text-sm text-gray-500">{cmd.desc}</div>
            </button>
          ))}
        </div>
        <div className="p-3 bg-gray-50 text-xs text-gray-500 flex items-center justify-between rounded-b-xl">
          <span>Press ⌘J to open command bar</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export const QuickActions = ({ issue }) => {
  const [showActions, setShowActions] = useState(false);

  const actions = [
    { label: 'Move to Done', icon: CheckIcon, color: 'green' },
    { label: 'Assign to Me', icon: ArrowRightIcon, color: 'blue' },
    { label: 'Add Comment', icon: ArrowLeftIcon, color: 'purple' }
  ];

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        ⚡
      </button>

      {showActions && (
        <div
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 space-y-1 z-10 min-w-[200px]"
        >
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-${action.color}-50 transition-colors text-left`}
              >
                <Icon className={`w-4 h-4 text-${action.color}-600`} />
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DragToReorder = ({ items, onReorder }) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedOver, setDraggedOver] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDraggedOver(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedItem, 1);
    newItems.splice(index, 0, removed);

    onReorder?.(newItems);
    setDraggedItem(null);
    setDraggedOver(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          className={`p-4 bg-white border rounded-lg cursor-move transition-all ${
            draggedItem === index ? 'opacity-50 scale-95' : ''
          } ${
            draggedOver === index ? 'border-purple-500 border-2' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-gray-400">⋮⋮</div>
            <div className="flex-1">{item}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ShakeToUndo = ({ onUndo }) => {
  const [shakeCount, setShakeCount] = useState(0);
  const lastShake = useRef(Date.now());

  useEffect(() => {
    const handleShake = (e) => {
      const acceleration = e.accelerationIncludingGravity;
      const threshold = 15;

      if (
        Math.abs(acceleration.x) > threshold ||
        Math.abs(acceleration.y) > threshold ||
        Math.abs(acceleration.z) > threshold
      ) {
        const now = Date.now();
        if (now - lastShake.current > 1000) {
          setShakeCount(prev => prev + 1);
          lastShake.current = now;
          
          if (shakeCount >= 2) {
            onUndo?.();
            setShakeCount(0);
          }
        }
      }
    };

    window.addEventListener('devicemotion', handleShake);
    return () => window.removeEventListener('devicemotion', handleShake);
  }, [shakeCount, onUndo]);

  return null;
};
