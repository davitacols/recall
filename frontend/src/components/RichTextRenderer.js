import React from 'react';
import 'react-quill/dist/quill.snow.css';
import RichText from './RichText';

/**
 * RichTextRenderer — conversation/reply body rendering.
 *
 * Previously this injected its argument straight into the DOM with
 * dangerouslySetInnerHTML and no sanitisation, which was survivable only while
 * every writer was an authenticated member of the workspace. Pull request
 * capture ended that: these fields now carry text written by anyone who can
 * comment on a connected repository.
 *
 * It also assumed HTML unconditionally, so a markdown body rendered as literal
 * `**` and `>` with its line breaks collapsed.
 *
 * Both problems belong to RichText now. This wrapper stays because several
 * call sites import it and pass a darkMode flag; the styling below is
 * unchanged so nothing shifts visually.
 */
export default function RichTextRenderer({ content, darkMode }) {
  const textColor = 'var(--app-text)';
  const linkColor = 'var(--app-info)';
  const codeBg = darkMode ? '#292524' : '#f3f4f6';
  const quoteBorder = darkMode ? '#44403c' : '#d1d5db';
  const bgColor = darkMode ? 'var(--app-surface)' : 'var(--app-surface-alt)';

  return (
    <div>
      <style>{`
        .rich-content {
          color: ${textColor} !important;
          font-size: 15px;
          line-height: 1.65;
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
          font-size: 17px;
          font-weight: 650;
          margin-bottom: 8px;
          margin-top: 18px;
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
          padding-left: 14px;
          margin: 12px 0;
          color: var(--app-muted) !important;
        }
        .rich-content blockquote p:last-child { margin-bottom: 0; }
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
          font-size: 13.5px;
          font-family: monospace;
        }
        .rich-content strong {
          font-weight: 650;
        }
        .rich-content em {
          font-style: italic;
        }
      `}</style>
      <RichText content={content} className="rich-content ql-editor" />
    </div>
  );
}
