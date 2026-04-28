import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

/**
 * ChatMessage component for displaying individual messages in a chat bubble.
 * It distinguishes between 'user' and 'ai' messages via different styles.
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender_type === 'user';

  return (
    <div
      data-testid="chat-message"
      data-sender={message.sender_type}
      className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'
        }`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
          }`}
      >
        <p data-testid="message-content" className="text-sm md:text-base whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <span
          data-testid="message-timestamp"
          className={`text-[10px] mt-1 block opacity-70 ${isUser ? 'text-indigo-100' : 'text-gray-500'
            }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
