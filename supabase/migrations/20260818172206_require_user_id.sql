-- Every document and chat thread must have an owner. The rows that predated
-- user scoping (see 20260818170315_add_user_scoping.sql) have since been
-- backfilled to a real user by hand, so this is now safe to enforce.

alter table documents alter column user_id set not null;
alter table chat_threads alter column user_id set not null;
