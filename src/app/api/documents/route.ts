import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { withJsonErrors } from "@/lib/api-utils";
import { getAuthedUser } from "@/lib/auth";
import type { DocumentRecord } from "@/lib/types";

export const GET = withJsonErrors(async () => {
  const auth = await getAuthedUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, filename, status, error, page_count, char_count, chunk_count, created_at
     FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );

  const documents: DocumentRecord[] = rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    status: row.status,
    error: row.error,
    pageCount: row.page_count,
    charCount: row.char_count,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ documents });
});
