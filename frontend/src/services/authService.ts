import api from './api';
import { AuthResponse, ChatMessageResponse, ApiResponse } from '../types';

/**
 * AuthService provides methods for user authentication:
 * signup, login, getMe, sendMagicLink, and verifyMagicLink.
 */
class AuthService {
  /**
   * Registers a new user.
   */
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/signup', { email, password, firstName, lastName });
    return response.data;
  }

  /**
   * Authenticates an existing user.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { token, user } = response.data.data!;

    // Store token and user info for session persistence
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));

    return response.data;
  }

  /**
   * Retrieves the current authenticated user's profile.
   */
  async getMe(): Promise<AuthResponse> {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
  }

  /**
   * Requests a magic link via email.
   */
  async sendMagicLink(email: string): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/send-magic-link', { email });
    return response.data;
  }

  /**
   * Verifies the magic link token from the URL.
   */
  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const response = await api.get<AuthResponse>(`/auth/verify?token=${token}`);
    const { token: newToken, user } = response.data.data!;

    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(user));

    return response.data;
  }

  /**
   * Clears the authentication session.
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

export default new AuthService();
