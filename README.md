# Enterprise Smart Document Compliance Agent

Upload corporate policy PDFs (HR manuals, security policies, privacy policies), chat with them using retrieval-augmented generation, and run an AI-driven compliance audit against a standard set of governance, privacy, and security rules.

## Stack

- **Frontend / API:** Next.js (App Router) + TypeScript + Tailwind CSS
- **AI orchestration:** Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`)
- **Vector store:** Postgres + pgvector (self-hosted, Supabase-compatible - see below)
- **PDF parsing:** `unpdf`, token-aware chunking via `gpt-tokenizer`

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` - Postgres connection string
   - `OPENAI_API_KEY` - used for chat ("Fast" mode) and for all embeddings (chat and audits always embed via OpenAI, since Anthropic has no embeddings endpoint)
   - `ANTHROPIC_API_KEY` - used for chat/audit "Robust" mode
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` - only needed if you run Postgres via the included `docker-compose.yml`

2. Start Postgres with pgvector:
   ```bash
   docker compose up -d db
   ```

3. Install dependencies and run the app:
   ```bash
   npm install
   npm run dev
   ```

The database schema (documents, chunks, audits) is created automatically on first request - no separate migration step is needed.

### Note on the vector store

The spec calls for a "free tier vector store" via Supabase. Supabase's vector store is itself Postgres + the `pgvector` extension, so this project talks to a plain Postgres instance (via `pg`) running the `pgvector/pgvector` image, which is API-compatible with how you'd query vectors on Supabase. Point `DATABASE_URL` at a hosted Supabase Postgres connection string (with the `vector` extension enabled) to use this app against a real Supabase project with no code changes.

## How it works

- **Ingest** (`/api/ingest`): extracts text from an uploaded PDF, splits it into ~500-token chunks with a 50-token overlap, embeds each chunk (OpenAI `text-embedding-3-small`), and stores them in `pgvector`.
- **Chat** (`/api/chat`): a tool-calling RAG agent. The model can call a `searchPolicyDocuments` tool to retrieve relevant chunks before answering, and cites the source document and page.
- **Audit** (`/api/audit`): retrieves relevant excerpts for each of 10 standard governance/privacy/security rules (see `src/lib/audit-rules.ts`) and asks the model to return a structured pass/partial/fail verdict, evidence, and recommendation per rule, plus an overall compliance score.
