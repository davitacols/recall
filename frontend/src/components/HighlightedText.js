import React from 'react';
import { Link } from 'react-router-dom';

const HighlightedText = ({ text }) => {
  const parseText = (text) => {
    const lines = text.split('\n');
    const result = [];
    
    lines.forEach((line) => {
      const parts = [];
      let lastIndex = 0;
      
      const regex = /(@[\w\s]+)|(@\w+)|(#\w+)/g;
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: line.substring(lastIndex, match.index)
          });
        }
        
        if (match[1] || match[2]) {
          parts.push({
            type: 'mention',
            content: match[0]
          });
        } else if (match[3]) {
          parts.push({
            type: 'tag',
            content: match[3]
          });
        }
        
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push({
          type: 'text',
          content: line.substring(lastIndex)
        });
      }
      
      result.push({ type: 'line', parts, isEmpty: line.trim() === '' });
    });
    
    return result;
  };
  
  const lines = parseText(text);
  
  return (
    <div>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className={line.isEmpty ? 'h-6' : 'mb-4'}>
          {line.parts.map((part, partIndex) => {
            if (part.type === 'mention') {
              return (
                <span
                  key={partIndex}
                  className="text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  {part.content}
                </span>
              );
            } else if (part.type === 'tag') {
              const tagName = part.content.substring(1);
              return (
                <Link
                  key={partIndex}
                  to={`/conversations?tag=${tagName}`}
                  className="text-gray-900 font-semibold hover:underline"
                >
                  {part.content}
                </Link>
              );
            } else {
              return <span key={partIndex}>{part.content}</span>;
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default HighlightedText;
