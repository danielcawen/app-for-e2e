import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import authController from '../controllers/authController';
import chatController from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const wrap = (fn: (req: any, res: Response, next?: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => fn(req, res, next).catch(next);

/**
 * Auth Routes
 */
router.post('/auth/signup', wrap(authController.signup.bind(authController)));
router.post('/auth/login', wrap(authController.login.bind(authController)));
router.get('/auth/me', authMiddleware, wrap((req, res) => authController.getMe(req, res)));
router.post('/auth/send-magic-link', wrap(authController.sendMagicLink.bind(authController)));
router.get('/auth/verify', wrap(authController.verifyMagicLink.bind(authController)));

/**
 * Chat Routes (Protected)
 */
router.use('/chat', authMiddleware);

router.post('/chat/conversations', wrap(chatController.createConversation.bind(chatController)));
router.post('/chat/messages', wrap(chatController.sendMessage.bind(chatController)));
router.get('/chat/messages/:conversationId', wrap(chatController.getMessages.bind(chatController)));
router.delete('/chat/messages/:messageId', wrap(chatController.deleteMessage.bind(chatController)));

export default router;
