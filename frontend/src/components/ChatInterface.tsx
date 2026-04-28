import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from './ChatMessage';
import { Message, User } from '../types';

interface ChatInterfaceProps {
  onLogout: () => void;
  user: User | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLogout, user }) => {
  const {
    messages,
    loading,
    error,
    isSending,
    startNewChat,
    sendMessage,
    loadMessages,
    currentConversationId
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize a conversation on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        await startNewChat();
      } catch (err) {
        console.error('Failed to initialize chat:', err);
      }
    };
    initChat();
  }, [startNewChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const messageContent = input.trim();
    setInput(''); // Clear input immediately for UX

    try {
      await sendMessage(messageContent);
    } catch (err) {
      console.error('Error sending message:', err);
      // The error is handled by the useChat hook
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gray-50 shadow-xl">
      {/* Header */}
      <header data-testid="chat-header" className="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">AI Assistant</h1>
          <p data-testid="conversation-id" className="text-xs text-indigo-100">
            {currentConversationId ? `Chat ID: ${currentConversationId}` : 'Initializing...'}
          </p>
        </div>
        {user && (
          <span data-testid="logged-in-user" className="text-sm text-indigo-100">
            {user.first_name} {user.last_name}
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            data-testid="new-chat-button"
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1 rounded text-sm transition-colors"
            disabled={loading}
          >
            New Chat
          </button>
          <button
            onClick={onLogout}
            data-testid="logout-button"
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded text-sm transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div data-testid="chat-error" className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 m-4 rounded shadow-sm animate-pulse">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Messages Area */}
      <main data-testid="messages-list" className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300">
        {messages.length === 0 && !loading && (
          <div data-testid="empty-chat" className="text-center text-gray-400 mt-20">
            <p className="text-lg">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <ChatMessage key={msg.id || index} message={msg} />
        ))}

        {loading && (
          <div data-testid="ai-thinking" className="flex justify-start">
            <div className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl animate-pulse">
              AI is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} data-testid="chat-form" className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isSending || loading}
            data-testid="message-input"
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || loading}
            data-testid="send-button"
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 transform rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          Powered by AI Service (OpenAI/Ollama/Mock)
        </p>
      </footer>
    </div>
  );
};

export default ChatInterface;
