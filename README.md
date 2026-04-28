# E2E Practice App

A full-stack application for practicing end-to-end testing across multiple layers: UI, REST API, PostgreSQL, email, and AI chatbot.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15 |
| Email | Nodemailer + Mailhog (local SMTP) |
| AI | Mock / Ollama / OpenAI |
| Container | Docker + Docker Compose |

## Quick Start

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker-compose up --build

# In a separate terminal, run migrations
docker exec e2d-backend npm run migrate
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| API Health | http://localhost:3001/ |
| Mailhog UI | http://localhost:8025 |
| PgAdmin | http://localhost:5050 (admin@example.com / admin) |

## Development (without Docker)

```bash
# Terminal 1 — start PostgreSQL and Mailhog via Docker only
docker-compose up db mailhog

# Terminal 2 — backend
cd backend
npm install
npm run migrate
npm run dev

# Terminal 3 — frontend
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | No | Register |
| POST | /api/auth/login | No | Login |
| GET | /api/auth/me | Yes | Current user |
| POST | /api/auth/send-magic-link | No | Request magic link |
| GET | /api/auth/verify?token= | No | Verify magic link |
| POST | /api/chat/conversations | Yes | Create conversation |
| POST | /api/chat/messages | Yes | Send message |
| GET | /api/chat/messages/:conversationId | Yes | Get history |
| DELETE | /api/chat/messages/:messageId | Yes | Delete message |

## Testing the App

1. Open http://localhost:5173
2. Sign up with an email and password
3. Send messages to the AI chatbot
4. Test magic link login — check Mailhog at http://localhost:8025 for the email
5. Inspect the database at http://localhost:5050
