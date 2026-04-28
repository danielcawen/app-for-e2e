# Full-Stack E2E Testing Practice Application Plan

## Project Overview
A minimal but feature-complete application for practicing end-to-end testing across all layers: UI, REST API, PostgreSQL database, email services, and AI chatbot integration.

---

## Application Architecture

### Tech Stack
- **Frontend**: React (TypeScript)
- **Backend**: Node.js/Express
- **Database**: PostgreSQL
- **Email**: Nodemailer (with ethereal/Mailtrap for testing)
- **AI/Chatbot**: OpenAI API compatible (supports local models via Ollama)
- **Containerization**: Docker & Docker Compose

### Core Features
1. **Authentication System**
   - Email/password signup
   - Login with email verification option
   - Session management
   - Token-based authentication (JWT)

2. **Email Integration**
   - Send login verification email
   - Send magic link login
   - Email delivery status tracking

3. **Chat Interface**
   - Real-time messaging with AI chatbot
   - Conversation history stored in database
   - Message persistence

4. **Database Models**
   - Users table (email, password_hash, created_at, verified_at)
   - Messages table (user_id, content, sender, created_at)
   - Email_logs table (user_id, recipient, subject, sent_at, status)

---

## Detailed Requirements

### 1. User Authentication & Login Page

**UI Requirements:**
- Login form with email and password fields
- "Send login link via email" button
- Sign up link
- Sign up form (email, password, confirm password)
- Forgot password option
- Form validation feedback
- Loading states during submission

**API Endpoints:**
```
POST /api/auth/signup
  - Request: { email, password }
  - Response: { userId, token }
  - Status codes: 201, 400, 409 (email exists)

POST /api/auth/login
  - Request: { email, password }
  - Response: { userId, token, user }
  - Status codes: 200, 401 (invalid credentials)

POST /api/auth/send-login-email
  - Request: { email }
  - Response: { message: "Email sent", email }
  - Status codes: 200, 404 (user not found)

POST /api/auth/verify-magic-link
  - Request: { token }
  - Response: { token (JWT), user }
  - Status codes: 200, 400 (invalid/expired token)

GET /api/auth/me
  - Headers: Authorization: Bearer {token}
  - Response: { userId, email, createdAt }
  - Status codes: 200, 401 (unauthorized)

POST /api/auth/logout
  - Headers: Authorization: Bearer {token}
  - Response: { message: "Logged out" }
  - Status codes: 200
```

**Database Schema - Users:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. Email Service Integration

**Features:**
- Send verification emails on signup
- Send magic link emails for passwordless login
- Track email delivery status
- Retry mechanism for failed sends

**Email Service Configuration:**
- Primary: Ethereal Email (free, for testing)
- Alternative: Mailtrap.io (more features)
- Fallback: Log to console in development

**API Endpoint:**
```
GET /api/emails/status/:emailId
  - Response: { id, recipient, subject, status, sent_at, error_message }
  - Status codes: 200, 404
```

**Database Schema - Email Logs:**
```sql
CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  email_type VARCHAR(50), -- 'verification', 'magic_link', 'password_reset'
  status VARCHAR(50), -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. Chat Interface & AI Integration

**UI Requirements:**
- Message input field
- Send button
- Chat history display (scrollable)
- Message timestamps
- Indicator for AI responses vs user messages
- Loading state while waiting for AI response
- Error handling for failed requests

**API Endpoints:**
```
POST /api/messages
  - Headers: Authorization: Bearer {token}
  - Request: { content }
  - Response: { id, userId, content, sender, createdAt, conversationId }
  - Status codes: 201, 400, 401

GET /api/messages
  - Headers: Authorization: Bearer {token}
  - Query: ?limit=50&offset=0
  - Response: [{ id, content, sender, createdAt }, ...]
  - Status codes: 200, 401

POST /api/chat/ask
  - Headers: Authorization: Bearer {token}
  - Request: { message }
  - Response: { userMessage, aiResponse, conversationId }
  - Status codes: 201, 400, 401, 503 (AI service unavailable)

DELETE /api/messages/:messageId
  - Headers: Authorization: Bearer {token}
  - Response: { message: "Deleted" }
  - Status codes: 200, 404, 403 (not owner)
```

**Database Schema - Messages:**
```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  sender VARCHAR(20), -- 'user' or 'ai'
  ai_model VARCHAR(100), -- 'gpt-3.5-turbo', 'ollama/mistral', etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. AI/Chatbot Service

**Supported Models:**
1. **OpenAI API** (requires API key)
   - Model: gpt-3.5-turbo
   - Endpoint: https://api.openai.com/v1/chat/completions

2. **Local Ollama** (free, no API key)
   - Models: mistral, neural-chat, openchat, etc.
   - Endpoint: http://localhost:11434/api/generate

3. **Hugging Face Inference** (requires API key)
   - Various open models available

**Configuration:**
- Environment variable: `AI_PROVIDER` (openai | ollama | huggingface)
- Fallback to mock responses if service unavailable
- Rate limiting: 10 requests per minute per user
- Timeout: 30 seconds per request

**Implementation Details:**
```javascript
// Example: AI Service abstraction
class AIService {
  async generateResponse(message) {
    // Routes to correct provider based on config
    // Returns { response, model, tokens_used }
  }
}
```

---

## Directory Structure

```
e2e-practice-app/
├── docker-compose.yml
├── .env.example
├── .env.test
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── email.ts
│   │   │   └── ai.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── messages.ts
│   │   │   ├── chat.ts
│   │   │   └── emails.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── chatController.ts
│   │   │   └── emailController.ts
│   │   ├── services/
│   │   │   ├── UserService.ts
│   │   │   ├── EmailService.ts
│   │   │   ├── AIService.ts
│   │   │   └── AuthService.ts
│   │   ├── models/
│   │   │   └── database.ts
│   │   └── utils/
│   │       ├── jwt.ts
│   │       ├── passwordHash.ts
│   │       └── logger.ts
│   └── tests/
│       ├── setup.ts
│       └── ... (test files)
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   └── NotFound.tsx
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   └── useMessages.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css
│   └── tests/
│       └── ... (test files)
│
├── tests/
│   ├── e2e/
│   │   ├── fixtures/
│   │   │   └── test-data.ts
│   │   ├── specs/
│   │   │   ├── auth.spec.ts
│   │   │   ├── chat.spec.ts
│   │   │   ├── email.spec.ts
│   │   │   ├── database.spec.ts
│   │   │   └── full-flow.spec.ts
│   │   └── helpers/
│   │       ├── api.helper.ts
│   │       ├── db.helper.ts
│   │       ├── email.helper.ts
│   │       └── ui.helper.ts
│   ├── api/
│   │   └── ... (API-only tests)
│   └── integration/
│       └── ... (integration tests)
│
└── docs/
    ├── API.md
    ├── TESTING.md
    ├── SETUP.md
    └── ARCHITECTURE.md
```

---

## Docker Compose Setup

**Services:**
1. **PostgreSQL** - Database
2. **Backend** - Node.js/Express API
3. **Frontend** - React app
4. **Ollama** (optional) - Local AI model
5. **Mailhog** (optional) - Email testing UI
6. **Redis** (optional) - Session/rate limiting cache

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: e2e_practice
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # UI
    environment:
      MAILHOG_STORAGE: memory

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Note: You'll need to run: docker exec ollama ollama pull mistral

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://devuser:devpass@postgres:5432/e2e_practice
      NODE_ENV: development
      JWT_SECRET: dev-secret-key
      EMAIL_SERVICE: ethereal  # or mailhog, sendgrid
      EMAIL_HOST: mailhog
      EMAIL_PORT: 1025
      AI_PROVIDER: ollama  # or openai, huggingface
      AI_BASE_URL: http://ollama:11434
      FRONTEND_URL: http://localhost:5173
    depends_on:
      postgres:
        condition: service_healthy
      mailhog:
        condition: service_started
      ollama:
        condition: service_started
    volumes:
      - ./backend/src:/app/src
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src

volumes:
  postgres_data:
  ollama_data:
```

---

## Testing Strategy

### Test Scenarios by Layer

#### 1. UI Tests (Playwright/Cypress)
```
✓ Login with email and password
✓ Login via email magic link
✓ Sign up new user
✓ Form validation (invalid email, weak password)
✓ Failed login attempt
✓ Send message to chatbot
✓ View message history
✓ Logout
✓ Session persistence
✓ Responsive design
```

#### 2. API Tests (REST Client/Postman/Jest)
```
✓ POST /auth/signup - valid data
✓ POST /auth/signup - duplicate email
✓ POST /auth/login - valid credentials
✓ POST /auth/login - invalid credentials
✓ POST /auth/send-login-email
✓ POST /auth/verify-magic-link
✓ GET /auth/me - with valid token
✓ GET /auth/me - without token (401)
✓ POST /messages - create message
✓ GET /messages - retrieve history
✓ POST /chat/ask - normal flow
✓ POST /chat/ask - AI service down (graceful)
✓ GET /emails/status/:id
✓ Rate limiting enforcement
```

#### 3. Database Tests
```
✓ User created with hashed password
✓ User not duplicated on same email
✓ Message persisted to database
✓ Message linked to correct user
✓ Email logs recorded
✓ Timestamps accurate
✓ Indexes work correctly
✓ Cascading deletes work
```

#### 4. Email Tests
```
✓ Verification email sent on signup
✓ Magic link email sent on request
✓ Email contains correct link
✓ Email log created with status
✓ Token expires after 24 hours
✓ Failed email logged in database
✓ Retry mechanism works
```

#### 5. AI/Chatbot Tests
```
✓ Message sent and stored
✓ AI response received within timeout
✓ Conversation history retrieved
✓ AI responds with sensible content
✓ Rate limiting enforced
✓ Fallback response when AI down
✓ Model switching works (OpenAI -> Ollama)
```

#### 6. Full E2E Flow Tests
```
✓ Complete signup → email verification → login → chat → message
✓ Magic link login flow
✓ User can chat immediately after login
✓ Chat history persists across sessions
✓ Multiple users don't see each other's messages
```

---

## Running Tests with Claude Terminal Client

### Prerequisite Setup Commands
```bash
# Clone repository
git clone <repo-url> && cd e2e-practice-app

# Start all services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps  # Check health status

# Run database migrations
docker exec e2e-practice-app-backend npm run migrate

# (Optional) Load Ollama model
docker exec ollama ollama pull mistral
```

### Test Execution Plan for LLM

**Claude can execute:**

```bash
# 1. Unit tests
npm run test:unit

# 2. API tests
npm run test:api

# 3. E2E UI tests
npm run test:e2e

# 4. Full test suite
npm run test

# 5. With coverage report
npm run test:coverage

# 6. Specific test file
npm run test -- auth.spec.ts

# 7. Database snapshot tests
npm run test:db

# 8. Email delivery tests
npm run test:email

# 9. AI integration tests
npm run test:ai
```

### Test Report Paths
```
./coverage/          - Coverage reports
./test-results/      - JUnit XML reports
./screenshots/       - Failed test screenshots
./videos/            - E2E test recordings
./logs/              - Application logs
```

---

## Environment Variables

**`.env.example`:**
```
# Database
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/e2e_practice
DB_HOST=localhost
DB_PORT=5432
DB_USER=devuser
DB_PASSWORD=devpass

# API
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# Frontend
VITE_API_URL=http://localhost:3000

# Email
EMAIL_SERVICE=mailhog  # mailhog, ethereal, sendgrid, smtp
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_FROM=noreply@e2epractice.local

# AI Provider
AI_PROVIDER=ollama  # ollama, openai, huggingface
AI_BASE_URL=http://localhost:11434
AI_MODEL=mistral
OPENAI_API_KEY=  # if using OpenAI
OPENAI_MODEL=gpt-3.5-turbo

# Testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPass123!
DATABASE_URL_TEST=postgresql://devuser:devpass@localhost:5432/e2e_practice_test

# Logging
LOG_LEVEL=debug
```

---

## Key Testing Workflows for LLM Agents

### Workflow 1: Complete Authentication Flow
```
1. Call POST /auth/signup with new user data
2. Query database: SELECT * FROM users WHERE email = ?
3. Check email_logs table for verification email
4. Extract magic link from email
5. Call POST /auth/verify-magic-link with token
6. Verify JWT token in response
7. Call GET /auth/me with token (should succeed)
8. Call GET /auth/me without token (should fail with 401)
```

### Workflow 2: Email Delivery Chain
```
1. Trigger signup → email generated
2. Check email_logs table (status = 'pending')
3. Wait for email service to process
4. Verify status changes to 'sent'
5. Retrieve email from Mailhog API
6. Validate email content (link, formatting)
7. Extract and test the link in email
8. Verify user marked as verified in database
```

### Workflow 3: Chat & AI Integration
```
1. Authenticate user
2. Send message via POST /chat/ask
3. Verify message stored in database
4. Check AI response matches expected pattern
5. Verify conversation_id created
6. Retrieve messages with GET /messages
7. Confirm message count correct
8. Test AI failure scenario (mock AI down)
9. Verify graceful fallback response
```

### Workflow 4: Database Integrity
```
1. Create test user
2. Create conversation
3. Send 5 messages
4. Query: SELECT COUNT(*) FROM messages WHERE user_id = ?
5. Verify count = 5
6. Query with JOIN to verify relationships
7. Test cascade delete: delete user
8. Verify all user's messages deleted
9. Verify no orphaned records
```

---

## Development Quickstart

### Local Development (without Docker)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Tests (new terminal)
npm run test:e2e
```

### With Docker
```bash
docker-compose up
# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - Mailhog: http://localhost:8025
# - Postgres: localhost:5432
```

---

## API Response Examples

### Successful Login
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Chat Response
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": 42,
      "content": "What is 2+2?",
      "sender": "user",
      "createdAt": "2024-01-15T10:35:00Z"
    },
    "aiResponse": {
      "id": 43,
      "content": "2+2 equals 4.",
      "sender": "ai",
      "aiModel": "mistral",
      "createdAt": "2024-01-15T10:35:02Z"
    },
    "conversationId": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "statusCode": 401
  }
}
```

---

## Monitoring & Debugging

### Useful Commands
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Database shell
docker exec -it e2e-practice-app-postgres psql -U devuser -d e2e_practice

# Check email
curl http://localhost:8025/api/emails

# Check API health
curl http://localhost:3000/health

# List all users
curl http://localhost:3000/api/users -H "Authorization: Bearer {token}"
```

### Debug Endpoints (Development Only)
```
GET /api/debug/reset-db - Reset database to clean state
GET /api/debug/seed-data - Populate with test data
POST /api/debug/trigger-email - Send test email
GET /api/debug/ai-status - Check AI service status
```

---

## Next Steps

1. **Phase 1: Setup**
   - Create project structure
   - Set up Docker Compose
   - Configure database

2. **Phase 2: Core Features**
   - Implement authentication
   - Build login/signup UI
   - Create API endpoints

3. **Phase 3: Email**
   - Integrate email service
   - Create verification flow
   - Add magic link login

4. **Phase 4: Chat**
   - Build chat UI
   - Implement messaging API
   - Integrate AI service

5. **Phase 5: Testing**
   - Write E2E tests
   - Write API tests
   - Write database tests
   - Document test cases

---

## Success Metrics

- [ ] All endpoints return correct status codes
- [ ] Database integrity maintained across all operations
- [ ] Emails sent within 5 seconds
- [ ] AI responses within 30 seconds
- [ ] UI renders without errors
- [ ] No orphaned database records
- [ ] 90%+ test coverage
- [ ] All E2E tests pass consistently
