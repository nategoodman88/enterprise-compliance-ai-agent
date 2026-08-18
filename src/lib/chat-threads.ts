import type { UIMessage } from "ai";
import { getPool } from "./db";

// A single ongoing thread per document, plus one global thread (documentId
// null) for the "All documents" scope - see the chat_threads migration for
// how thread_key collapses that into one unique key per scope.
export async function getThreadMessages(documentId: string | null): Promise<UIMessage[]> {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT messages FROM chat_threads WHERE thread_key = $1`, [
    documentId ?? "all",
  ]);
  return rows[0]?.messages ?? [];
}

export async function saveThreadMessages(
  documentId: string | null,
  messages: UIMessage[]
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO chat_threads (document_id, messages, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (thread_key)
     DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()`,
    [documentId, JSON.stringify(messages)]
  );
}
