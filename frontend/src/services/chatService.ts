import api from './api';
import { ChatMessageResponse, ApiResponse, Message } from '../types';

class ChatService {
  async createConversation(): Promise<number> {
    const response = await api.post<ApiResponse<{ conversationId: number }>>('/chat/conversations');
    return response.data.data!.conversationId;
  }

  async sendMessage(conversationId: number, content: string): Promise<ChatMessageResponse> {
    const response = await api.post<ApiResponse<ChatMessageResponse>>('/chat/messages', {
      conversationId,
      content,
    });
    return response.data.data!;
  }

  async getMessages(conversationId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const response = await api.get<ApiResponse<{ messages: Message[] }>>(
      `/chat/messages/${conversationId}?limit=${limit}&offset=${offset}`
    );
    return response.data.data!.messages;
  }

  async deleteMessage(messageId: number): Promise<void> {
    await api.delete(`/chat/messages/${messageId}`);
  }
}

export default new ChatService();
