import { useState, useEffect, useCallback, useRef } from 'react';
import chatService from '../services/chatService';
import { Message } from '../types';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const startNewChat = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const conversationId = await chatService.createConversation();
      setCurrentConversationId(conversationId);
      setMessages([]);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to start new chat';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const history = await chatService.getMessages(conversationId, 50, 0);
      if (isMounted.current) {
        setMessages(history);
        setCurrentConversationId(conversationId);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to load messages';
      if (isMounted.current) setError(errMsg);
      throw err;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const sendMessage = async (content: string): Promise<void> => {
    if (!currentConversationId) {
      throw new Error('No active conversation. Please start a new chat.');
    }

    if (isSending) return;

    setIsSending(true);
    setError(null);

    const userMsg: Message = {
      id: Date.now(),
      sender_type: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await chatService.sendMessage(currentConversationId, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMsg.id),
        response.userMessage,
        response.aiResponse,
      ]);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to send message';
      setError(errMsg);
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg]);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number): Promise<void> => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to delete message';
      setError(errMsg);
      throw err;
    }
  };

  return {
    messages,
    currentConversationId,
    loading,
    error,
    isSending,
    startNewChat,
    loadMessages,
    sendMessage,
    deleteMessage,
  };
}
