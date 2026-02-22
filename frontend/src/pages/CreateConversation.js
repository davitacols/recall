import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../utils/ThemeAndAccessibility';
import RichTextEditor from '../components/RichTextEditor';
import api from '../services/api';
import { useToast } from '../components/Toast';

function CreateConversation() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'discussion',
    tags: ''
  });
  const [loading, setLoading] = useState(false);

  const bgColor = '#1c1917';
  const textColor = '#ffffff';
  const borderColor = '#b45309';
  const hoverBg = '#292415';
  const secondaryText = '#d1d5db';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      const response = await api.post('/api/conversations/', payload);
      addToast('Conversation created successfully', 'success');
      navigate(`/conversations/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      console.error('Error response:', error.response);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to create conversation';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '64px' }}>
        <button
          onClick={() => navigate('/conversations')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', backgroundColor: 'transparent', border: 'none', color: secondaryText, cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'color 0.2s', padding: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.color = textColor}
          onMouseLeave={(e) => e.currentTarget.style.color = secondaryText}
        >
          <ArrowLeftIcon style={{ width: '16px', height: '16px' }} />
          Back to Conversations
        </button>
        <h1 style={{ fontSize: '56px', fontWeight: 900, color: textColor, marginBottom: '12px', letterSpacing: '-0.02em' }}>Start a Conversation</h1>
        <p style={{ fontSize: '20px', color: secondaryText, fontWeight: 300 }}>Share your thoughts, ask questions, or start a discussion</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '32px' }}>
          {/* Type Selection */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: secondaryText, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { value: 'question', label: 'Question' },
                { value: 'discussion', label: 'Discussion' },
                { value: 'decision', label: 'Decision' },
                { value: 'blocker', label: 'Blocker' }
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, post_type: type.value })}
                  style={{
                    padding: '16px',
                    backgroundColor: formData.post_type === type.value ? '#d97706' : bgColor,
                    border: `1px solid ${formData.post_type === type.value ? '#d97706' : borderColor}`,
                    color: textColor,
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.post_type !== type.value) {
                      e.currentTarget.style.borderColor = textColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.post_type !== type.value) {
                      e.currentTarget.style.borderColor = borderColor;
                    }
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: secondaryText, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What's on your mind?"
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: hoverBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = textColor}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
          </div>

          {/* Content */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: secondaryText, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description *
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Provide details, context, or ask your question..."
              darkMode={darkMode}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: secondaryText, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="frontend, backend, urgent (comma-separated)"
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: hoverBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = textColor}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
            <p style={{ marginTop: '8px', fontSize: '12px', color: secondaryText, fontWeight: 300 }}>
              Separate tags with commas
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/conversations')}
              disabled={loading}
              style={{
                padding: '16px 32px',
                backgroundColor: 'transparent',
                border: `1px solid ${borderColor}`,
                color: textColor,
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: loading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.borderColor = textColor;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.borderColor = borderColor;
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 32px',
                backgroundColor: '#d97706',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: loading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#fbbf24';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#d97706';
              }}
            >
              {loading ? 'Creating...' : 'Create Conversation'}
            </button>
          </div>
        </div>
      </form>

      {/* Tips */}
      <div style={{ marginTop: '32px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '24px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.target.style.borderColor = textColor} onMouseLeave={(e) => e.target.style.borderColor = borderColor}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, color: secondaryText, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tips for great conversations
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>•</span>
            <span style={{ color: secondaryText, fontSize: '14px', fontWeight: 300 }}>
              Use a clear, descriptive title that summarizes your topic
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>•</span>
            <span style={{ color: secondaryText, fontSize: '14px', fontWeight: 300 }}>
              Provide context and background information in the description
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>•</span>
            <span style={{ color: secondaryText, fontSize: '14px', fontWeight: 300 }}>
              Choose the right type to help others understand the purpose
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>•</span>
            <span style={{ color: secondaryText, fontSize: '14px', fontWeight: 300 }}>
              Add relevant tags to make your conversation discoverable
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CreateConversation;
