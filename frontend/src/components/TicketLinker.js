import React, { useState } from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';

function TicketLinker({ decisionId, existingLinks = [], onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [ticketUrl, setTicketUrl] = useState('');
  const [ticketType, setTicketType] = useState('github');

  const handleAdd = () => {
    if (!ticketUrl.trim()) return;
    
    const newLink = {
      url: ticketUrl,
      type: ticketType,
      id: extractTicketId(ticketUrl, ticketType)
    };
    
    onUpdate([...existingLinks, newLink]);
    setTicketUrl('');
    setShowModal(false);
  };

  const extractTicketId = (url, type) => {
    if (type === 'github') {
      const match = url.match(/\/pull\/(\d+)|\/issues\/(\d+)/);
      return match ? `#${match[1] || match[2]}` : '';
    }
    if (type === 'jira') {
      const match = url.match(/([A-Z]+-\d+)/);
      return match ? match[1] : '';
    }
    return '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Linked Tickets</h3>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm text-gray-900 hover:underline font-medium"
        >
          + Add link
        </button>
      </div>

      {existingLinks.length === 0 ? (
        <p className="text-sm text-gray-600">No tickets linked yet</p>
      ) : (
        <div className="space-y-2">
          {existingLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border border-gray-200 hover:border-gray-900 transition-colors"
            >
              <LinkIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-900 font-medium">{link.id || 'View ticket'}</span>
              <span className="text-xs text-gray-500 ml-auto">{link.type}</span>
            </a>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Link ticket</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTicketType('github')}
                  className={`flex-1 px-4 py-2 border font-medium transition-colors ${
                    ticketType === 'github'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-900 hover:border-gray-900'
                  }`}
                >
                  GitHub
                </button>
                <button
                  onClick={() => setTicketType('jira')}
                  className={`flex-1 px-4 py-2 border font-medium transition-colors ${
                    ticketType === 'jira'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-900 hover:border-gray-900'
                  }`}
                >
                  Jira
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-2">URL</label>
              <input
                type="url"
                value={ticketUrl}
                onChange={(e) => setTicketUrl(e.target.value)}
                placeholder="https://github.com/org/repo/pull/123"
                className="w-full p-3 border border-gray-900 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 font-medium transition-colors"
              >
                Add Link
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketLinker;
