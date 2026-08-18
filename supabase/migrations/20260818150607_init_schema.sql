-- Enterprise Smart Document Compliance Agent - initial schema.
-- Safe to run against a fresh Supabase project via `supabase db push`.

create extension if not exists vector;

-- Uploaded policy documents. The original file bytes live in the
-- "policy-documents" storage bucket (created below) at `storage_path`;
-- this row tracks processing status and extracted-text metadata.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text,
  mime_type text,
  status text not null default 'processing',
  error text,
  page_count integer,
  char_count integer,
  chunk_count integer,
  created_at timestamptz not null default now()
);

-- Token-chunked, embedded excerpts of each document, used for vector
-- similarity search by both chat (RAG) and audits.
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  page_number integer,
  content text not null,
  token_count integer not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists chunks_embedding_idx
  on chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_document_id_idx
  on chunks (document_id);

-- Structured results of a compliance audit run against a document.
create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  model_mode text not null,
  overall_score integer not null,
  summary text not null,
  findings jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists audits_document_id_idx
  on audits (document_id);

-- One persisted chat thread per document, plus a single global thread
-- (document_id null) for the "All documents" scope. `thread_key` collapses
-- that nullable FK into a single value ('all' or the document id) so a
-- plain unique index can enforce "at most one thread per scope" -
-- otherwise a plain UNIQUE(document_id) would allow unlimited NULL rows.
create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  thread_key text generated always as (coalesce(document_id::text, 'all')) stored,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists chat_threads_thread_key_key
  on chat_threads (thread_key);

-- Storage bucket for original uploaded files. Kept private - the server
-- uploads/downloads with the service role key (which bypasses RLS), so no
-- anon/authenticated storage policies are defined.
insert into storage.buckets (id, name, public)
values ('policy-documents', 'policy-documents', false)
on conflict (id) do nothing;
