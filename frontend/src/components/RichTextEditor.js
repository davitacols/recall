import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function RichTextEditor({ value, onChange, placeholder, darkMode }) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ]
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline',
    'list', 'bullet', 'blockquote', 'code-block', 'link'
  ];

  const bgColor = darkMode ? '#1c1917' : '#ffffff';
  const borderColor = darkMode ? '#292524' : '#e5e7eb';
  const textColor = darkMode ? '#e7e5e4' : '#111827';
  const toolbarBg = darkMode ? '#292524' : '#f9fafb';

  return (
    <div>
      <style>{`
        .quill-wrapper .ql-toolbar {
          background: ${toolbarBg};
          border: 1px solid ${borderColor};
          border-radius: 5px 5px 0 0;
        }
        .quill-wrapper .ql-container {
          background: ${bgColor};
          border: 1px solid ${borderColor};
          border-top: none;
          border-radius: 0 0 5px 5px;
          font-size: 14px;
        }
        .quill-wrapper .ql-editor {
          min-height: 150px;
          color: ${textColor} !important;
        }
        .quill-wrapper .ql-editor * {
          color: ${textColor} !important;
        }
        .quill-wrapper .ql-editor.ql-blank::before {
          color: ${darkMode ? '#a8a29e' : '#6b7280'} !important;
        }
        .quill-wrapper .ql-stroke {
          stroke: ${textColor};
        }
        .quill-wrapper .ql-fill {
          fill: ${textColor};
        }
        .quill-wrapper .ql-picker-label {
          color: ${textColor};
        }
      `}</style>
      <div className="quill-wrapper">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
