import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { AppError } from './errorHandler';

/**
 * Extended Request interface to include the authenticated user
 */
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to protect routes by verifying the JWT token in the Authorization header
 * Expects header format: "Bearer <token>"
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication token is missing or invalid', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
  }

  // Attach the user payload to the request object
  req.user = decoded;

  next();
};
