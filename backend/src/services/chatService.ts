import pool from '../db/pool';
import aiService from './aiService';
import { AppError } from '../middleware/errorHandler';

interface MessagePayload {
  content: string;
}

interface ChatMessage {
  id: number;
  sender_type: 'user' | 'ai';
  content: string;
  created_at: Date;
}

/**
 * ChatService handles the business logic for managing conversations and messages.
 * It coordinates between the database and the AI service.
 */
class ChatService {
  /**
   * Sends a message to a conversation and generates an AI response.
   * @param userId The ID of the user sending the message
   * @param conversationId The ID of the conversation
   * @param content The content of the user's message
   * @returns The user message and the generated AI response
   */
  async sendMessage(userId: number, conversationId: number, content: string): Promise<{ userMessage: ChatMessage; aiResponse: ChatMessage }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verify conversation belongs to the user
      const convCheck = await client.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (convCheck.rowCount === 0) {
        throw new AppError('Conversation not found or unauthorized', 404, 'CONVERSATION_NOT_FOUND');
      }

      // 2. Insert User Message
      const userMsgResult = await client.query(
        'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3) RETURNING id, sender_type, content, created_at',
        [conversationId, 'user', content]
      );
      const userMessage = userMsgResult.rows[0] as ChatMessage;

      // 3. Generate AI Response
      // Note: We call the AI service outside the transaction if possible,
      // but here we keep it simple. In a high-scale app, you'd use a background job.
      const aiContent = await aiService.generateResponse(content, conversationId);

      // 4. Insert AI Message
      const aiMsgResult = await client.query(
        'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3) RETURNING id, sender_type, content, created_at',
        [conversationId, 'ai', aiContent]
      );
      const aiResponse = aiMsgResult.rows[0] as ChatMessage;

      await client.query('COMMIT');

      return {
        userMessage,
        aiResponse
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves the message history for a conversation.
   * @param conversationId The ID of the conversation
   * @param limit Maximum number of messages to retrieve
   * @param offset Number of messages to skip
   * @returns Array of messages
   */
  async getMessages(conversationId: number, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    const result = await pool.query(
      `SELECT id, sender_type, content, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    return result.rows as ChatMessage[];
  }

  /**
   * Deletes a message from a conversation.
   * @param messageId The ID of the message to delete
   * @param userId The ID of the user performing the deletion
   * @returns The deleted message ID
   */
  async deleteMessage(messageId: number, userId: number): Promise<number> {
    // First, verify the user owns the conversation containing this message
    const checkResult = await pool.query(
      `SELECT m.id FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE m.id = $1 AND c.user_id = $2`,
      [messageId, userId]
    );

    if (checkResult.rowCount === 0) {
      throw new AppError('Message not found or unauthorized', 404, 'MESSAGE_NOT_FOUND');
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

    // Let's fix that typo in my thought process and just return the ID
    return messageId;
  }

  /**
   * Creates a new conversation for a user.
   * @param userId The ID of the user
   * @returns The ID of the new conversation
   */
  async createConversation(userId: number): Promise<number> {
    const result = await pool.query(
      'INSERT INTO conversations (user_id) VALUES ($1) RETURNING id',
      [userId]
    );
    return result.rows[0].id;
  }
}

export default new ChatService();
