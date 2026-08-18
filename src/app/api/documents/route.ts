import { NextResponse } from "next/server";
import { ensureSchema, getPool } from "@/lib/db";
import type { DocumentRecord } from "@/lib/types";

export async function GET() {
  await ensureSchema();
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, filename, status, error, page_count, char_count, chunk_count, created_at
     FROM documents ORDER BY created_at DESC`
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
}
