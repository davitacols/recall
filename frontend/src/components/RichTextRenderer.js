import React from 'react';
import 'react-quill/dist/quill.snow.css';

export default function RichTextRenderer({ content, darkMode }) {
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const linkColor = '#3b82f6';
  const codeBg = darkMode ? '#292524' : '#f3f4f6';
  const quoteBorder = darkMode ? '#44403c' : '#d1d5db';
  const bgColor = darkMode ? '#1c1917' : '#ffffff';

  return (
    <div>
      <style>{`
        .rich-content {
          color: ${textColor} !important;
          font-size: 14px;
          line-height: 1.6;
          background: ${bgColor} !important;
        }
        .rich-content * {
          color: ${textColor} !important;
        }
        .rich-content h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          margin-top: 16px;
        }
        .rich-content h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 10px;
          margin-top: 14px;
        }
        .rich-content h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          margin-top: 12px;
        }
        .rich-content p {
          margin-bottom: 12px;
        }
        .rich-content ul, .rich-content ol {
          margin-bottom: 12px;
          padding-left: 24px;
        }
        .rich-content li {
          margin-bottom: 4px;
        }
        .rich-content a {
          color: ${linkColor} !important;
          text-decoration: underline;
        }
        .rich-content blockquote {
          border-left: 3px solid ${quoteBorder};
          padding-left: 12px;
          margin: 12px 0;
          font-style: italic;
        }
        .rich-content pre {
          background: ${codeBg};
          padding: 12px;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 12px;
        }
        .rich-content code {
          background: ${codeBg};
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 13px;
          font-family: monospace;
        }
        .rich-content strong {
          font-weight: 600;
        }
        .rich-content em {
          font-style: italic;
        }
      `}</style>
      <div className="rich-content ql-editor" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
