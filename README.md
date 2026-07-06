# LeadPilot AI — Production CRM Copilot

An intelligent CRM platform for sales teams with 5 embedded AI modules, RAG-powered chat, semantic search, and a modern dark-mode SaaS dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LeadPilot AI                            │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Next.js 15      │    │  Express.js API                  │   │
│  │  App Router      │◄──►│  Clean Architecture              │   │
│  │  React Query     │    │  Repository + Service Pattern    │   │
│  │  Zustand         │    │  JWT Auth + Google OAuth         │   │
│  └──────────────────┘    └──────────────┬───────────────────┘   │
│                                         │                       │
│                                   ┌─────▼──────┐                │
│                                   │  Postgres  │                │
│                                   │  Prisma +  │                │
│                                   │  pgvector  │                │
│                                   └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## AI Modules

| Module | Endpoint | Description |
|--------|----------|-------------|
| Lead Summary | `POST /api/ai/leads/:id/summary` | Customer profile, pain points, buying signals |
| Follow-up Generator | `POST /api/ai/leads/:id/follow-up` | Email / WhatsApp / call script |
| Lead Scoring | `POST /api/ai/leads/:id/score` | 0–100 score with confidence + reasons |
| Semantic Search | `GET /api/ai/search?q=...` | Natural language lead search via pgvector |
| CRM Copilot | `POST /api/ai/chat` | Full RAG with source citations |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (only needed for a local Postgres — skip if using a hosted Postgres like Supabase)
- OpenAI API key (or Ollama running locally, or Groq — free)

### 1. Start infrastructure

```bash
docker compose up postgres -d
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — add OPENAI_API_KEY at minimum
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `admin@demo.leadpilot.ai` / `Demo1234!`

### Full Docker deployment

```bash
cp backend/.env.example backend/.env
# fill in all secrets
docker compose up --build
```

## API Documentation

Swagger UI available at `http://localhost:4000/api/docs`

## Testing

```bash
# Backend unit + integration tests
cd backend && npm test

# Backend with coverage report
cd backend && npm run test:coverage

# Frontend E2E (Playwright)
cd frontend && npm run test:e2e
```

## Project Structure

```
leadpilot-ai/
├── backend/
│   ├── src/
│   │   ├── ai/                 # Provider abstraction + pgvector client
│   │   ├── config/             # Env, DB, Passport, Swagger
│   │   ├── controllers/        # Route handlers (no business logic)
│   │   ├── domain/             # Domain types
│   │   ├── jobs/               # Cron jobs (token cleanup, cache eviction)
│   │   ├── middleware/         # Auth, rate limit, validation, audit log
│   │   ├── repositories/       # Prisma data access layer
│   │   ├── routes/             # Express routers
│   │   ├── services/           # Business logic
│   │   ├── tests/              # Integration tests
│   │   ├── utils/              # Logger, errors, response, crypto
│   │   └── validators/         # Zod schemas
│   └── prisma/
│       ├── schema.prisma       # Full DB schema with 13 models
│       └── seed.ts             # Demo data
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, Register, Forgot Password
│   │   └── (dashboard)/        # Dashboard, Leads, Copilot, Search
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # React Query hooks
│   ├── lib/                    # API client, utils
│   ├── providers/              # QueryClient, auth init
│   ├── services/               # API service layer
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript API contracts
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Clean Architecture | Separates business rules from infrastructure, enables testability without mocking framework internals |
| Repository Pattern | Centralizes all Prisma queries; swappable for testing |
| AI Provider Abstraction | Single interface over OpenAI and Ollama — switchable via `AI_PROVIDER` env var, zero code changes |
| Soft Delete (isArchived) | Preserves lead history for AI context and audit compliance |
| Async Embedding Upsert | Embedding updates fire-and-forget after lead mutations to keep API p99 low |
| Refresh Token Rotation | Each use of a refresh token issues a new one and revokes the old — prevents token theft replay |
| Content Hash on Embeddings | Skip re-embedding when lead content hasn't changed — reduces AI API costs |
| Postgres-backed Cache on AI results | AI summaries cached for 6h, scores for 2h — prevents redundant LLM calls |

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for the full reference.

## License

MIT
