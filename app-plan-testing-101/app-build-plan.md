# Full-Stack E2E Testing Practice Application - Build Plan

A practical guide to build a complete application that covers all testing layers: UI, REST API, PostgreSQL database, email integration, and AI chatbot.

---

## Project Overview

**Name:** E2E Practice App  
**Purpose:** Provide a realistic full-stack application for learning end-to-end testing across multiple layers  
**Deployment:** Docker/Docker Compose for easy setup

### Final Application Features
1. User authentication (email/password)
2. Magic link email-based login
3. AI-powered chatbot on authenticated page
4. Message history stored in database
5. Email delivery tracking

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript + Vite | 18+ |
| **Backend** | Node.js + Express + TypeScript | 20+ |
| **Database** | PostgreSQL | 16 |
| **Email** | Nodemailer (Mailhog for testing) | Latest |
| **AI** | Ollama (local) or OpenAI | Compatible |
| **Container** | Docker + Docker Compose | Latest |

---

## Phase 1: Project Setup & Infrastructure

### Step 1.1: Initialize Project Structure

```bash
# Create project root
mkdir e2e-practice-app && cd e2e-practice-app

# Initialize git
git init
git config user.name "daniel cawen"
git config user.email "cawendaniel@gmail.com"

# Create directory structure
mkdir backend frontend tests docs logs
mkdir -p backend/src/{config,middleware,routes,controllers,services,models,utils}
mkdir -p frontend/src/{pages,components,hooks,services,types,styles}
mkdir -p tests/{e2e,api,integration}

# Create root files
touch .gitignore Dockerfile.backend Dockerfile.frontend docker-compose.yml
touch .env.example .env.test README.md
```

### Step 1.2: Create Root Configuration Files

**`.gitignore`:**
```
node_modules/
dist/
build/
.env
.env.local
.DS_Store
*.log
coverage/
.vscode/
.idea/
postgres_data/
ollama_data/
redis_data/
```

**`README.md`:**
```markdown
# E2E Practice App

A full-stack application for practicing end-to-end testing.

## Quick Start

```bash
docker-compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Mailhog: http://localhost:8025
- PgAdmin: http://localhost:5050
```

### Step 1.3: Backend Initial Setup

```bash
cd backend

# Initialize Node project
npm init -y

# Install core dependencies
npm install express cors dotenv pg jsonwebtoken bcryptjs axios

# Install dev dependencies
npm install --save-dev typescript @types/node @types/express nodemon ts-node

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
EOF

# Create src/index.ts
touch src/index.ts
```

**`backend/package.json` scripts section:**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "migrate": "ts-node src/migrate.ts"
  }
}
```

### Step 1.4: Frontend Initial Setup

```bash
cd ../frontend

# Create React + Vite project structure
npm create vite@latest . -- --template react-ts

# Install additional dependencies
npm install react-router-dom axios zustand

# Install dev dependencies
npm install --save-dev tailwindcss postcss autoprefixer

# Initialize Tailwind
npx tailwindcss init -p

# Create environment file
cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:3000
EOF
```

### Step 1.5: Docker Configuration

**`backend/Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Expose port
EXPOSE 3000

# Run in development mode
CMD ["npm", "run", "dev"]
```

**`frontend/Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json ./

# Expose port
EXPOSE 5173

# Run in development mode
CMD ["npm", "run", "dev"]
```

---

## Phase 2: Database Setup

### Step 2.1: Create Database Models

**`backend/src/models/database.ts`:**
```typescript
import { Pool } from 'pg';

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Execute raw SQL
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export default pool;
```

### Step 2.2: Create Migration Script

**`backend/src/migrate.ts`:**
```typescript
import pool from './models/database';

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  email_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender VARCHAR(20),
  ai_model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
`;

async function migrate() {
  try {
    console.log('Running migrations...');
    await pool.query(schema);
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
```

### Step 2.3: Database Configuration

**`backend/src/config/database.ts`:**
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DATABASE_URL?.split('/').pop() || 'e2e_practice',
  user: process.env.DB_USER || 'devuser',
  password: process.env.DB_PASSWORD || 'devpass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}
```

---

## Phase 3: Backend Core Implementation

### Step 3.1: Utility Functions

**`backend/src/utils/jwt.ts`:**
```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRY = process.env.JWT_EXPIRY || '7d';

export function createToken(userId: number, email: string) {
  return jwt.sign(
    { userId, email },
    SECRET,
    { expiresIn: EXPIRY }
  );
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET) as { userId: number; email: string };
  } catch (err) {
    throw new Error('Invalid token');
  }
}

export function createMagicLinkToken(userId: number) {
  const token = jwt.sign(
    { userId, type: 'magic_link' },
    SECRET,
    { expiresIn: '24h' }
  );
  return token;
}
```

**`backend/src/utils/passwordHash.ts`:**
```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

### Step 3.2: Middleware

**`backend/src/middleware/auth.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  userId?: number;
  email?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'No token provided' }
    });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.email = payload.email;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
}
```

**`backend/src/middleware/errorHandler.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode
      }
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
}
```

### Step 3.3: Services

**`backend/src/services/UserService.ts`:**
```typescript
import { pool } from '../config/database';
import { hashPassword, comparePassword } from '../utils/passwordHash';
import { createToken, createMagicLinkToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  async signup(email: string, password: string) {
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      throw new AppError('EMAIL_EXISTS', 409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = createToken(user.id, email);

    return { user, token };
  }

  async login(email: string, password: string) {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    const token = createToken(user.id, user.email);

    return { user: { id: user.id, email: user.email }, token };
  }

  async getUserById(userId: number) {
    const result = await pool.query(
      'SELECT id, email, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    return result.rows[0];
  }

  async sendMagicLink(email: string) {
    // Find user
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 404, 'User not found');
    }

    const user = result.rows[0];
    const magicToken = createMagicLinkToken(user.id);

    // Store token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, magicToken, expiresAt]
    );

    return magicToken;
  }
}

export default new UserService();
```

**`backend/src/services/EmailService.ts`:**
```typescript
import nodemailer from 'nodemailer';
import { pool } from '../config/database';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'localhost',
  port: parseInt(process.env.EMAIL_PORT || '1025'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: process.env.EMAIL_USER ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  } : undefined
});

export class EmailService {
  async sendMagicLinkEmail(email: string, magicToken: string) {
    const magicLink = `${process.env.FRONTEND_URL}/auth/magic-link?token=${magicToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@e2epractice.local',
      to: email,
      subject: 'Your Login Link',
      html: `
        <h2>Login to E2E Practice App</h2>
        <p>Click the link below to login:</p>
        <a href="${magicLink}">${magicLink}</a>
        <p>This link expires in 24 hours.</p>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      // Log email in database
      await pool.query(
        'INSERT INTO email_logs (recipient, subject, body, email_type, status) VALUES ($1, $2, $3, $4, $5)',
        [email, mailOptions.subject, mailOptions.html, 'magic_link', 'sent']
      );

      return { success: true, info };
    } catch (err) {
      // Log failed email
      await pool.query(
        'INSERT INTO email_logs (recipient, subject, body, email_type, status, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
        [email, mailOptions.subject, mailOptions.html, 'magic_link', 'failed', String(err)]
      );

      throw err;
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string) {
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@e2epractice.local',
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Verify Your Email</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link expires in 24 hours.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);

      await pool.query(
        'INSERT INTO email_logs (recipient, subject, body, email_type, status) VALUES ($1, $2, $3, $4, $5)',
        [email, mailOptions.subject, mailOptions.html, 'verification', 'sent']
      );
    } catch (err) {
      await pool.query(
        'INSERT INTO email_logs (recipient, subject, body, email_type, status, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
        [email, mailOptions.subject, mailOptions.html, 'verification', 'failed', String(err)]
      );

      throw err;
    }
  }
}

export default new EmailService();
```

**`backend/src/services/AIService.ts`:**
```typescript
import axios from 'axios';

export class AIService {
  private provider: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'ollama';
    this.baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434';
    this.model = process.env.AI_MODEL || 'mistral';
  }

  async generateResponse(message: string): Promise<string> {
    try {
      if (this.provider === 'ollama') {
        return await this.generateOllama(message);
      } else if (this.provider === 'openai') {
        return await this.generateOpenAI(message);
      } else {
        return this.getMockResponse(message);
      }
    } catch (err) {
      console.error('AI generation error:', err);
      return this.getMockResponse(message);
    }
  }

  private async generateOllama(message: string): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model: this.model,
        prompt: message,
        stream: false
      },
      { timeout: 30000 }
    );

    return response.data.response;
  }

  private async generateOpenAI(message: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [{ role: 'user', content: message }],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  private getMockResponse(message: string): string {
    const responses = [
      'That\'s an interesting question!',
      'I\'m here to help you with that.',
      'Could you tell me more about that?',
      'I think you\'re on the right track.',
      'That makes sense to me.'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export default new AIService();
```

### Step 3.4: Controllers

**`backend/src/controllers/authController.ts`:**
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import UserService from '../services/UserService';
import EmailService from '../services/EmailService';
import { verifyToken } from '../utils/jwt';

export class AuthController {
  async signup(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Email and password required' }
        });
      }

      const { user, token } = await UserService.signup(email, password);

      return res.status(201).json({
        success: true,
        data: { user, token }
      });
    } catch (err) {
      throw err;
    }
  }

  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Email and password required' }
        });
      }

      const { user, token } = await UserService.login(email, password);

      return res.status(200).json({
        success: true,
        data: { user, token }
      });
    } catch (err) {
      throw err;
    }
  }

  async getMe(req: AuthRequest, res: Response) {
    try {
      const user = await UserService.getUserById(req.userId!);

      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      throw err;
    }
  }

  async sendMagicLink(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_EMAIL', message: 'Email required' }
        });
      }

      const magicToken = await UserService.sendMagicLink(email);
      await EmailService.sendMagicLinkEmail(email, magicToken);

      return res.status(200).json({
        success: true,
        data: { message: 'Magic link sent', email }
      });
    } catch (err) {
      throw err;
    }
  }

  async verifyMagicLink(req: AuthRequest, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Token required' }
        });
      }

      const payload = verifyToken(token);
      const user = await UserService.getUserById(payload.userId);
      const jwtToken = require('../utils/jwt').createToken(user.id, user.email);

      return res.status(200).json({
        success: true,
        data: { user, token: jwtToken }
      });
    } catch (err) {
      throw err;
    }
  }
}

export default new AuthController();
```

**`backend/src/controllers/chatController.ts`:**
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import AIService from '../services/AIService';

export class ChatController {
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const { content } = req.body;
      const userId = req.userId!;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_CONTENT', message: 'Message content required' }
        });
      }

      // Get or create conversation
      let conversationResult = await pool.query(
        'SELECT id FROM conversations WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      let conversationId: number;
      if (conversationResult.rows.length === 0) {
        const createResult = await pool.query(
          'INSERT INTO conversations (user_id) VALUES ($1) RETURNING id',
          [userId]
        );
        conversationId = createResult.rows[0].id;
      } else {
        conversationId = conversationResult.rows[0].id;
      }

      // Store user message
      const userMsgResult = await pool.query(
        'INSERT INTO messages (conversation_id, user_id, content, sender) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
        [conversationId, userId, content, 'user']
      );

      // Get AI response
      const aiContent = await AIService.generateResponse(content);

      // Store AI message
      const aiMsgResult = await pool.query(
        'INSERT INTO messages (conversation_id, user_id, content, sender, ai_model) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
        [conversationId, userId, aiContent, 'ai', 'mistral']
      );

      return res.status(201).json({
        success: true,
        data: {
          conversationId,
          userMessage: {
            id: userMsgResult.rows[0].id,
            content,
            sender: 'user',
            createdAt: userMsgResult.rows[0].created_at
          },
          aiResponse: {
            id: aiMsgResult.rows[0].id,
            content: aiContent,
            sender: 'ai',
            createdAt: aiMsgResult.rows[0].created_at
          }
        }
      });
    } catch (err) {
      throw err;
    }
  }

  async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await pool.query(
        `SELECT m.id, m.content, m.sender, m.created_at 
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.user_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return res.status(200).json({
        success: true,
        data: result.rows.reverse() // Return in chronological order
      });
    } catch (err) {
      throw err;
    }
  }

  async deleteMessage(req: AuthRequest, res: Response) {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.userId!;

      // Verify ownership
      const result = await pool.query(
        'SELECT user_id FROM messages WHERE id = $1',
        [messageId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Message not found' }
        });
      }

      if (result.rows[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized' }
        });
      }

      await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

      return res.status(200).json({
        success: true,
        data: { message: 'Message deleted' }
      });
    } catch (err) {
      throw err;
    }
  }
}

export default new ChatController();
```

### Step 3.5: Routes

**`backend/src/routes/auth.ts`:**
```typescript
import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', (req, res, next) => authController.signup(req as any, res).catch(next));
router.post('/login', (req, res, next) => authController.login(req as any, res).catch(next));
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req as any, res).catch(next));
router.post('/send-login-email', (req, res, next) => authController.sendMagicLink(req as any, res).catch(next));
router.post('/verify-magic-link', (req, res, next) => authController.verifyMagicLink(req as any, res).catch(next));

export default router;
```

**`backend/src/routes/chat.ts`:**
```typescript
import { Router } from 'express';
import chatController from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/ask', authMiddleware, (req, res, next) => chatController.sendMessage(req as any, res).catch(next));
router.get('/messages', authMiddleware, (req, res, next) => chatController.getMessages(req as any, res).catch(next));
router.delete('/messages/:messageId', authMiddleware, (req, res, next) => chatController.deleteMessage(req as any, res).catch(next));

export default router;
```

### Step 3.6: Main Server File

**`backend/src/index.ts`:**
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('Cannot start server without database connection');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
```

---

## Phase 4: Frontend Implementation

### Step 4.1: Project Structure

**`frontend/src/types/index.ts`:**
```typescript
export interface User {
  id: number;
  email: string;
  createdAt: string;
  isVerified: boolean;
}

export interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  createdAt: string;
}

export interface ChatResponse {
  conversationId: number;
  userMessage: Message;
  aiResponse: Message;
}

export interface AuthResponse {
  user: User;
  token: string;
}
```

### Step 4.2: API Service

**`frontend/src/services/api.ts`:**
```typescript
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (email: string, password: string) =>
    client.post('/api/auth/signup', { email, password }),

  login: (email: string, password: string) =>
    client.post('/api/auth/login', { email, password }),

  getMe: () =>
    client.get('/api/auth/me'),

  sendMagicLink: (email: string) =>
    client.post('/api/auth/send-login-email', { email }),

  verifyMagicLink: (token: string) =>
    client.post('/api/auth/verify-magic-link', { token })
};

export const chatAPI = {
  sendMessage: (content: string) =>
    client.post('/api/chat/ask', { content }),

  getMessages: (limit = 50, offset = 0) =>
    client.get('/api/chat/messages', { params: { limit, offset } }),

  deleteMessage: (messageId: number) =>
    client.delete(`/api/chat/messages/${messageId}`)
};
```

**`frontend/src/services/auth.ts`:**
```typescript
import { User, AuthResponse } from '../types';
import { authAPI } from './api';

export const authService = {
  async signup(email: string, password: string) {
    const response = await authAPI.signup(email, password);
    const { token, user } = response.data.data;

    localStorage.setItem('token', token);
    return user;
  },

  async login(email: string, password: string) {
    const response = await authAPI.login(email, password);
    const { token, user } = response.data.data;

    localStorage.setItem('token', token);
    return user;
  },

  async getUser(): Promise<User | null> {
    try {
      const response = await authAPI.getMe();
      return response.data.data;
    } catch (err) {
      return null;
    }
  },

  async sendMagicLink(email: string) {
    await authAPI.sendMagicLink(email);
  },

  async verifyMagicLink(token: string) {
    const response = await authAPI.verifyMagicLink(token);
    const { token: jwtToken, user } = response.data.data;

    localStorage.setItem('token', jwtToken);
    return user;
  },

  logout() {
    localStorage.removeItem('token');
  }
};
```

### Step 4.3: React Hooks

**`frontend/src/hooks/useAuth.ts`:**
```typescript
import { useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getUser().then(setUser).finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
```

**`frontend/src/hooks/useChat.ts`:**
```typescript
import { useState } from 'react';
import { Message, ChatResponse } from '../types';
import { chatAPI } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await chatAPI.sendMessage(content);
      const { userMessage, aiResponse } = response.data.data;

      setMessages(prev => [...prev, userMessage, aiResponse]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error sending message');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages();
      setMessages(response.data.data);
    } catch (err) {
      setError('Error loading messages');
    }
  };

  return { messages, loading, error, sendMessage, loadMessages };
}
```

### Step 4.4: Components

**`frontend/src/components/LoginForm.tsx`:**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-4 py-2 border rounded"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

**`frontend/src/components/ChatInterface.tsx`:**
```typescript
import { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  loading: boolean;
  onSendMessage: (content: string) => void;
}

export function ChatInterface({ messages, loading, onSendMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 4.5: Pages

**`frontend/src/pages/LoginPage.tsx`:**
```typescript
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">E2E Practice App</h1>
        <LoginForm />
      </div>
    </div>
  );
}
```

**`frontend/src/pages/ChatPage.tsx`:**
```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { ChatInterface } from '../components/ChatInterface';
import { authService } from '../services/auth';

export function ChatPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, loading: chatLoading, sendMessage, loadMessages } = useChat();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadMessages();
  }, []);

  if (authLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="text-xl font-bold">Chat</h1>
        <button
          onClick={() => {
            authService.logout();
            navigate('/login');
          }}
          className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800"
        >
          Logout
        </button>
      </div>

      <ChatInterface messages={messages} loading={chatLoading} onSendMessage={sendMessage} />
    </div>
  );
}
```

### Step 4.6: Main App Router

**`frontend/src/App.tsx`:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Phase 5: Docker & Deployment

### Step 5.1: Docker Compose File

See the separate `docker-compose.yml` file provided.

### Step 5.2: Initialize Script

**`init.sql`:**
```sql
-- Initialization script runs automatically on first PostgreSQL startup
CREATE DATABASE IF NOT EXISTS e2e_practice;
```

### Step 5.3: Environment Files

**`.env.example`:**
```
# Database
DATABASE_URL=postgresql://devuser:devpass123@postgres:5432/e2e_practice
DB_HOST=postgres
DB_PORT=5432
DB_USER=devuser
DB_PASSWORD=devpass123

# Server
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRY=7d

# Frontend
VITE_API_URL=http://localhost:3000

# Email
EMAIL_SERVICE=mailhog
EMAIL_HOST=mailhog
EMAIL_PORT=1025
EMAIL_FROM=noreply@e2epractice.local
EMAIL_SECURE=false

# AI
AI_PROVIDER=ollama
AI_BASE_URL=http://ollama:11434
AI_MODEL=mistral
```

**`.env.test`:**
```
DATABASE_URL=postgresql://devuser:devpass123@postgres:5432/e2e_practice_test
NODE_ENV=test
AI_PROVIDER=mock
```

---

## Phase 6: Build & Deployment Steps

### Step 6.1: Build Images

```bash
# Build backend
docker build -t e2e-practice-backend:latest ./backend

# Build frontend
docker build -t e2e-practice-frontend:latest ./frontend
```

### Step 6.2: Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run migrations
docker exec e2e-practice-backend npm run migrate

# (Optional) Load Ollama model
docker exec e2e-practice-ollama ollama pull mistral
```

### Step 6.3: Access Points

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Mailhog UI: http://localhost:8025
- PgAdmin: http://localhost:5050 (admin@example.com / admin)
- API Health: http://localhost:3000/health

---

## Testing the Application

Once running, test:

1. **Create account** at http://localhost:5173
2. **Login** with credentials
3. **Send message** to chatbot
4. **Check Mailhog** at http://localhost:8025 for emails
5. **View database** at http://localhost:5050

---

## Summary of Files to Create

Backend (10 files):
- `src/index.ts` - Main server
- `src/config/database.ts` - DB config
- `src/config/email.ts` - Email config
- `src/config/ai.ts` - AI config
- `src/middleware/auth.ts` - Auth middleware
- `src/middleware/errorHandler.ts` - Error handling
- `src/services/UserService.ts` - User logic
- `src/services/EmailService.ts` - Email logic
- `src/services/AIService.ts` - AI logic
- `src/controllers/authController.ts` - Auth endpoints
- `src/controllers/chatController.ts` - Chat endpoints
- `src/routes/auth.ts` - Auth routes
- `src/routes/chat.ts` - Chat routes
- `src/models/database.ts` - DB connection
- `src/utils/jwt.ts` - JWT utilities
- `src/utils/passwordHash.ts` - Password utilities
- `src/migrate.ts` - Database migrations

Frontend (10+ files):
- `src/main.tsx` - Entry point
- `src/App.tsx` - Router
- `src/types/index.ts` - TypeScript types
- `src/services/api.ts` - API client
- `src/services/auth.ts` - Auth service
- `src/hooks/useAuth.ts` - Auth hook
- `src/hooks/useChat.ts` - Chat hook
- `src/components/LoginForm.tsx`
- `src/components/ChatInterface.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/ChatPage.tsx`

Configuration:
- `docker-compose.yml` - Orchestration
- `.env.example` - Environment template
- `.env.test` - Test environment
- `Dockerfile.backend` - Backend image
- `Dockerfile.frontend` - Frontend image
- `backend/tsconfig.json` - TypeScript config
- `backend/package.json` - Dependencies
- `frontend/package.json` - Dependencies
- `frontend/vite.config.ts` - Vite config
- `frontend/tsconfig.json` - TypeScript config
