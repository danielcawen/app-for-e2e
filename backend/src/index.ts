import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import apiRoutes from './routes/apiRoutes';
import { errorHandler, AppError } from './middleware/errorHandler';
import pool from './db/pool';
import { migrate } from './db/migrate';

// Load environment variables from the root .after
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Handler for unmatched routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

/**
 * Starts the server and verifies database connection
 */
async function startServer() {
  try {
    await migrate();

    // Check database connection before starting the server
    const client = await pool.connect();
    console.log('✅ Database connection established successfully.');
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🚀 API base path: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database error:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  console.error('❌ Unhandled Rejection:', reason.message);
  // In a production environment, you might want to perform a graceful shutdown
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

startServer();
