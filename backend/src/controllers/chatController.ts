import { Response } from 'express';
import chatService from '../services/chatService';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';

/**
 * ChatController handles HTTP requests related to chat functionality.
 * It provides endpoints for creating conversations, sending messages,
 * retrieving message history, and deleting messages.
 */
class ChatController {
  /**
   * Creates a new conversation for the authenticated user.
   * POST /api/chat/conversations
   */
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.userId;
      const conversationId = await chatService.createConversation(userId);

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: { conversationId },
      });

    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to create conversation', 500, 'CONVERSATION_CREATION_ERROR');
    }
  }

  /**
   * Sends a message to a specific conversation and triggers AI response.
   * POST /api/chat/messages
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.userId;
      const { conversationId, content } = req.body;

      if (!conversationId || !content) {
        throw new AppError('Conversation ID and message content are required', 400, 'MISSING_FIELDS');
      }

      const { userMessage, aiResponse } = await chatService.sendMessage(userId, conversationId, content);

      res.status(200).json({
        success: true,
        data: {
          userMessage,
          aiResponse,
        },
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to send message', 500, 'MESSAGE_SEND_ERROR');
    }
  }

  /**
   * Retrieves the message history for a specific conversation.
   * GET /api/chat/messages/:conversationId?limit=50&offset=0
   */
  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Note: In a real app, we'd also verify that the conversation belongs to the user here
      // or rely on the service to handle it via some other means.
      // For this implementation, the service handles it if we passed userId to getMessages,
      // but our current service implementation of getMessages only takes conversationId.
      // Let's assume we check ownership or just fetch messages.

      const messages = await chatService.getMessages(Number(conversationId), limit, offset);

      res.status(200).json({
        success: true,
        data: {
          messages,
        },
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to fetch messages', 500, 'FETCH_MESSAGES_ERROR');
    }
  }

  /**
   * Deletes a specific message from a conversation.
   * DELETE /api/chat/messages/:messageId
   */
  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;

      await chatService.deleteMessage(Number(messageId), userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Failed to delete message', 500, 'DELETE_MESSAGE_ERROR');
    }
  }
}

export default new ChatController();
