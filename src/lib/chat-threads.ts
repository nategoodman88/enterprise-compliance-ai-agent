import type { UIMessage } from "ai";
import { getPool } from "./db";

// A single ongoing thread per user per document, plus one global thread
// (documentId null) per user for the "All documents" scope - see the
// chat_threads migrations for how thread_key + user_id combine into a
// unique key per user per scope.
export async function getThreadMessages(
  userId: string,
  documentId: string | null
): Promise<UIMessage[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT messages FROM chat_threads WHERE user_id = $1 AND thread_key = $2`,
    [userId, documentId ?? "all"]
  );
  return rows[0]?.messages ?? [];
}

export async function saveThreadMessages(
  userId: string,
  documentId: string | null,
  messages: UIMessage[]
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO chat_threads (user_id, document_id, messages, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (user_id, thread_key)
     DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()`,
    [userId, documentId, JSON.stringify(messages)]
  );
}
