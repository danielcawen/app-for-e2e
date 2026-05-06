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

# Start all services (migrations run automatically on backend startup)
# If needed: sudo systemctl start docker 
docker-compose up --build
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

# Terminal 2 — backend (migrations run automatically on startup)
cd backend
npm install
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

## AI Chat Configuration

The chatbot supports three providers, set via `.env`:

| `AI_PROVIDER` | Description |
|---------------|-------------|
| `mock` | Default — no external service needed |
| `ollama` | Local model via Ollama |
| `openai` | OpenAI API |

### Using Ollama (local model)

1. [Install Ollama](https://ollama.com) and pull a model:
   ```bash
   ollama pull llama3.2
   ```
2. Set these in your `.env`:
   ```
   AI_PROVIDER=ollama
   AI_MODEL=llama3.2
   AI_BASE_URL=http://localhost:11434        # local dev
   # AI_BASE_URL=http://host.docker.internal:11434  # if using Docker
   ```
3. Make sure Ollama is running (`ollama serve`) before starting the app.

> **Note:** When running via `docker-compose`, use `host.docker.internal` instead of `localhost` so the container can reach Ollama on your host machine.

## Testing the App

1. Open http://localhost:5173
2. Sign up with an email and password
3. Send messages to the AI chatbot
4. Test magic link login — check Mailhog at http://localhost:8025 for the email
5. Inspect the database at http://localhost:5050
