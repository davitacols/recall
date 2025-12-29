import { useState, useEffect } from 'react';
import api from '../services/api';

export function useDraftRecovery() {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDraft();
  }, []);

  const fetchDraft = async () => {
    try {
      const response = await api.get('/api/conversations/?drafts=true');
      const drafts = response.data.results || response.data || [];
      if (drafts.length > 0) {
        setDraft(drafts[0]);
      }
    } catch (error) {
      console.error('Failed to fetch draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async (formData) => {
    try {
      if (draft) {
        await api.put(`/api/conversations/${draft.id}/`, {
          ...formData,
          is_draft: true
        });
      } else {
        const response = await api.post('/api/conversations/', {
          ...formData,
          is_draft: true
        });
        setDraft(response.data);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const publishDraft = async () => {
    if (!draft) return;
    try {
      await api.put(`/api/conversations/${draft.id}/`, {
        is_draft: false
      });
      setDraft(null);
    } catch (error) {
      console.error('Failed to publish draft:', error);
    }
  };

  const deleteDraft = async () => {
    if (!draft) return;
    try {
      await api.delete(`/api/conversations/${draft.id}/`);
      setDraft(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  return { draft, loading, saveDraft, publishDraft, deleteDraft };
}
