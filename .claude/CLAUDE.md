# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**E2E Practice App**: A full-stack application for practicing end-to-end testing across multiple layers (UI, REST API, PostgreSQL, email, AI chatbot).

**Stack**: React 18 + TypeScript + Vite + Tailwind (frontend) | Node.js + Express + TypeScript (backend) | PostgreSQL 15 + Nodemailer/Mailhog (data & email) | Docker Compose (orchestration)

**Monorepo structure**: `/backend` and `/frontend` are independent npm workspaces with separate build pipelines.

---

## Development Commands

### Full Stack (Docker)
```bash
cp .env.example .env          # Configure environment
docker-compose up --build     # Start all services (migrations run automatically)
```

### Local Development (without Docker)
```bash
# Terminal 1: Database & email only
docker-compose up db mailhog

# Terminal 2: Backend (migrations run automatically on startup)
cd backend && npm install && npm run dev

# Terminal 3: Frontend
cd frontend && npm install && npm run dev
```

### Backend Commands
```bash
npm run dev          # Start dev server with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled JavaScript
npm run test         # Run Jest tests
npm run migrate      # Apply database migrations
npm run seed         # Seed database with sample data
```

### Frontend Commands
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Type-check with tsc, then build with Vite
npm run lint         # ESLint check (fails on warnings)
npm run preview      # Preview production build locally
```

### Access Points During Development
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Mailhog**: http://localhost:8025 (test email inbox)
- **PgAdmin**: http://localhost:5050 (user: admin@example.com, pass: admin)

---

## Architecture

### Backend (MVC + Services)
- **routes/**: Express route handlers mapping HTTP endpoints
- **controllers/**: Request handlers + response logic (auth, chat, messaging)
- **services/**: Business logic isolated from HTTP layer (ChatService for AI interaction, email handling)
- **middleware/**: Authentication (JWT), CORS, error handling
- **db/**: PostgreSQL connection pool, migrations (SQL), seeding
- **utils/**: Shared helpers (password hashing, token generation)

**Key patterns**:
- JWT-based auth (tokens in Authorization headers)
- Request validation happens in controllers before calling services
- Database pool from `db/pool.ts` — all queries use the shared pool
- Migrations are SQL files executed by `ts-node src/db/migrate.ts`

### Frontend (React + Pages + Services)
- **pages/**: Page-level components (Auth, Chat, etc.)
- **components/**: Reusable UI components
- **services/**: API client abstraction (axios calls to /api/*)
- **hooks/**: Custom React hooks (state, side effects)
- **types/**: Shared TypeScript interfaces (User, Message, Conversation)

**Key patterns**:
- React Router for SPA navigation
- Axios client for HTTP (baseURL set to backend API)
- Components read state from hooks, not direct API calls
- Tailwind for styling (no CSS files)

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project-Specific Workflows

### Adding a New API Endpoint
1. Create route in `backend/src/routes/*.ts` (map HTTP method + path)
2. Add controller method in `backend/src/controllers/*.ts` (validate request, call service)
3. Add service method in `backend/src/services/*.ts` (business logic, database calls)
4. If database schema change needed: add SQL migration, run `npm run migrate`
5. Frontend: add API call in `frontend/src/services/api.ts`, consume in page/hook

### Modifying Database Schema
1. Create new SQL file in `backend/src/db/` (or edit existing migration)
2. Run `npm run migrate` to apply changes
3. Update TypeScript types in backend (services/models)
4. Update frontend types if API response changes

### Testing Emails Locally
- Mailhog UI at http://localhost:8025 intercepts all emails from Nodemailer
- Useful for testing password reset, magic links, notifications
- Emails never leave localhost; safe to use test@example.com

### Running a Single Test
```bash
cd backend
npm test -- path/to/test.spec.ts
npm test -- --testNamePattern="test name pattern"
```

### Common Environment Variables
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: PostgreSQL credentials
- `DATABASE_URL`: Connection string (auto-generated in Docker)
- `JWT_SECRET`: Secret for signing auth tokens
- `MAIL_HOST`, `MAIL_PORT`: Nodemailer SMTP config (points to Mailhog in dev)
- `AI_PROVIDER`: "mock" | "ollama" | "openai" (determines chat service behavior)
- `AI_BASE_URL`: Ollama endpoint — use `http://host.docker.internal:11434` in Docker, `http://localhost:11434` for local dev

---

## Gotchas & Notes

1. **Backend migrations are SQL, not TypeScript ORM**. Always run migrations after schema changes.
2. **Frontend must rebuild** after backend changes if types change (types.ts is shared).
3. **Monorepo**: No shared code between `backend/` and `frontend/`. If you copy code between them, keep sync in mind.
4. **PostgreSQL required**: Backend fails fast if DB is unavailable (no fallback/mocking).
5. **JWT tokens expire**: Frontend must handle 401 responses and re-authenticate.
6. **Vite requires named exports for certain imports**: Check if `import * as X` is needed or if default export works.
7. **Ollama in Docker**: `AI_BASE_URL=http://localhost:11434` won't work from inside a container. Use `http://host.docker.internal:11434` to reach Ollama running on the host machine.