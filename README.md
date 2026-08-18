# Enterprise Smart Document Compliance Agent

Upload corporate policy PDFs (HR manuals, security policies, privacy policies), chat with them using retrieval-augmented generation, and run an AI-driven compliance audit against a standard set of governance, privacy, and security rules.

## Stack

- **Frontend / API:** Next.js (App Router) + TypeScript + Tailwind CSS
- **AI orchestration:** Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/react`)
- **Vector store & file storage:** Supabase (Postgres + pgvector for embeddings, Storage for the original uploaded files)
- **PDF/DOCX parsing:** `unpdf` and `mammoth`, token-aware chunking via `gpt-tokenizer`

## Setup

1. Create a Supabase project (or use an existing one) and apply the schema:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   (Or just paste `supabase/migrations/20260818150607_init_schema.sql` into the Supabase SQL editor.) This creates the `documents`, `chunks`, `audits`, and `chat_threads` tables plus a private `policy-documents` storage bucket.

2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` - your Supabase Postgres connection string (Project Settings → Database)
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` - Project Settings → API
   - `OPENAI_API_KEY` - used for chat ("Fast" mode) and for all embeddings (chat and audits always embed via OpenAI, since Anthropic has no embeddings endpoint)
   - `ANTHROPIC_API_KEY` - used for chat/audit "Robust" mode

3. Create your user(s) in Supabase (Dashboard → Authentication → Users → Add user). There's no sign-up flow - accounts are created by hand.

4. Install dependencies and run the app:
   ```bash
   npm install
   npm run dev
   ```

## Authentication

Every route (pages and API) requires a Supabase Auth session, enforced by `src/proxy.ts` (Next.js 16's renamed Middleware) plus a per-route check in each Route Handler. There's no public sign-up - create accounts directly in the Supabase dashboard.

Documents and chat threads are scoped to `user_id` (a foreign key to `auth.users`), and vector search (`searchChunks`) always filters by the requesting user, so one account can never see another's documents, chunks, or chat history.

## Local development

The simplest way to develop without touching production data: spin up a **second, free Supabase project** just for dev, apply the same migration to it (step 1 above), and point your local env at it instead.

Since Next.js loads `.env.local` on top of `.env` (and it's already gitignored), put your dev-project values there instead of overwriting `.env`:

```bash
# .env.local
DATABASE_URL='<dev project connection string>'
SUPABASE_URL='<dev project URL>'
SUPABASE_ANON_KEY='<dev project anon key>'
SUPABASE_SERVICE_ROLE_KEY='<dev project service role key>'
```

`npm run dev` will then use the dev project automatically, while `.env` (and `docker compose up`, which reads `.env` directly) still points at production.

## How it works

- **Ingest** (`/api/ingest`): extracts text from an uploaded PDF or DOCX, splits it into ~500-token chunks with a 50-token overlap, embeds each chunk (OpenAI `text-embedding-3-small`), and stores the chunks in `pgvector` plus the original file in Supabase Storage.
- **Chat** (`/api/chat`): a tool-calling RAG agent. The model can call a `searchPolicyDocuments` tool to retrieve relevant chunks before answering, and cites the source document and page (when one is available). Each document (and "All documents") has a persisted conversation thread that reloads automatically.
- **Audit** (`/api/audit`): retrieves relevant excerpts for each of 10 standard governance/privacy/security rules (see `src/lib/audit-rules.ts`) and asks the model to return a structured pass/partial/fail verdict, evidence, and recommendation per rule, plus an overall compliance score.
