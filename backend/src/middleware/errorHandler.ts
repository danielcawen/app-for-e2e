import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode: number, errorCode: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware for Express
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
  } else {
    // Log the actual error for the developer (in a real app, use a logger like winston)
    console.error(`[Error] ${err.message}`, { stack: err.stack });
  }

  const response: any = {
    success: false,
    error: {
      code: errorCode,
      message: message,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};
