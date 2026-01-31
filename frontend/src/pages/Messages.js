import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

function Messages() {
  const { userId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (userId) {
      setSelectedUser(parseInt(userId));
      fetchMessages(parseInt(userId));
    }
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/notifications/messages/');
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (uid) => {
    try {
      const response = await api.get(`/api/notifications/messages/${uid}/`);
      setMessages(response.data.messages);
      setSelectedUser(response.data.user_id);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await api.post('/api/notifications/messages/', {
        recipient_id: selectedUser,
        content: newMessage
      });
      setNewMessage('');
      fetchMessages(selectedUser);
      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
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
    <div className="flex h-screen bg-white">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-black text-gray-900">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.user_id}
                onClick={() => fetchMessages(conv.user_id)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-all ${
                  selectedUser === conv.user_id ? 'bg-gray-100 border-l-4 border-l-gray-900' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{conv.user_name}</h3>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                <p className="text-xs text-gray-500 mt-1">{conv.last_message_time ? new Date(conv.last_message_time).toLocaleDateString() : ''}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-black text-gray-900">
                {conversations.find(c => c.user_id === selectedUser)?.user_name}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === selectedUser ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-lg ${
                      msg.sender_id === selectedUser
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-gray-900 text-white'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-3 bg-gray-900 text-white hover:bg-black font-bold disabled:opacity-50 transition-all"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
