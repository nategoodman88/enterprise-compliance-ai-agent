-- Scope documents and chat threads to the authenticated user (Supabase Auth).
-- Chunks and audits are scoped implicitly through their parent document.
--
-- user_id is nullable here because rows created before this migration have
-- no owner yet. Backfill them to a real user, then run:
--   alter table documents alter column user_id set not null;
--   alter table chat_threads alter column user_id set not null;

alter table documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table chat_threads
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists documents_user_id_idx on documents (user_id);

-- thread_key ("all" or a document id) was globally unique before; now a
-- thread must be unique per user instead, since multiple users can each have
-- their own "All documents" thread and their own per-document threads.
drop index if exists chat_threads_thread_key_key;
create unique index if not exists chat_threads_user_thread_key_key
  on chat_threads (user_id, thread_key);
