import { useState, useEffect, useRef } from 'react';

export const useAutoSave = (saveFunction, delay = 2000) => {
  const [status, setStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const dataRef = useRef(null);

  const triggerSave = (data) => {
    dataRef.current = data;
    setStatus('unsaved');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFunction(dataRef.current);
        setStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        setStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getStatusText = () => {
    if (status === 'saving') return 'Saving...';
    if (status === 'saved' && lastSaved) {
      const seconds = Math.floor((new Date() - lastSaved) / 1000);
      if (seconds < 5) return 'Saved just now';
      if (seconds < 60) return `Saved ${seconds}s ago`;
      return 'Saved';
    }
    if (status === 'error') return 'Save failed';
    return '';
  };

  return { status, triggerSave, getStatusText };
};
