import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { BookmarkIcon } from '@heroicons/react/24/outline';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/api/conversations/bookmarks/');
      setBookmarks(response.data);
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookmarks</h1>
        <p className="text-base text-gray-600">{bookmarks.length} saved conversations</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20 border border-gray-200 bg-gray-50">
          <BookmarkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No bookmarks yet</h3>
          <p className="text-base text-gray-600">
            Save conversations for quick access later
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <Link
              key={bookmark.id}
              to={`/conversations/${bookmark.conversation_id}`}
              className="block border border-gray-200 p-6 hover:border-gray-900 transition-colors"
            >
              <div className="flex items-start gap-4">
                <BookmarkIcon className="w-5 h-5 text-gray-900 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {bookmark.conversation_title}
                  </h3>
                  {bookmark.note && (
                    <p className="text-sm text-gray-600 mb-2 italic">{bookmark.note}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{bookmark.conversation_type}</span>
                    <span>Saved {new Date(bookmark.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Bookmarks;
