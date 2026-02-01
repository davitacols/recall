import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

function Messages() {
  const { userId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(userId ? parseInt(userId) : null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
      const interval = setInterval(() => fetchMessages(selectedUser), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/notifications/messages/');
      setConversations(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await api.get(`/api/notifications/messages/${userId}/`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      await api.post('/api/notifications/messages/', {
        recipient_id: selectedUser,
        content: newMessage
      });
      setNewMessage('');
      await fetchMessages(selectedUser);
      await fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-5xl font-black text-gray-900 mb-12">Messages</h1>

        <div className="grid grid-cols-3 gap-8 h-96">
          {/* Conversations List */}
          <div className="border border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 font-bold text-gray-900">Conversations</div>
            {conversations.length === 0 ? (
              <div className="p-4 text-gray-600 text-sm">No conversations</div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedUser(conv.user_id)}
                  className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-all ${
                    selectedUser === conv.user_id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="font-bold text-gray-900">{conv.user_name}</div>
                  <div className="text-xs text-gray-600 truncate">{conv.last_message}</div>
                  {conv.unread_count > 0 && (
                    <div className="text-xs font-bold text-red-600 mt-1">{conv.unread_count} unread</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Messages */}
          <div className="col-span-2 border border-gray-200 flex flex-col">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-gray-200 font-bold text-gray-900">
                  {conversations.find(c => c.user_id === selectedUser)?.user_name}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === selectedUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_id === selectedUser
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-gray-900 text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-bold disabled:opacity-50 transition-all"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Messages;
