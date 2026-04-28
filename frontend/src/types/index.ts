export interface User {
  id: number;
  email: string;
  is_verified: boolean;
  created_at?: string;
}

export interface Message {
  id: number;
  sender_type: 'user' | 'ai';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export type AuthResponse = ApiResponse<{ user: User; token: string }>;

export interface ChatMessageResponse {
  userMessage: Message;
  aiResponse: Message;
}
