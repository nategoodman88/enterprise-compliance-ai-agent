import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { deleteDocumentFile } from "@/lib/supabase";
import { withJsonErrors } from "@/lib/api-utils";

export const DELETE = withJsonErrors(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query<{ storage_path: string | null }>(
    `SELECT storage_path FROM documents WHERE id = $1`,
    [id]
  );

  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);

  if (rows[0]?.storage_path) {
    await deleteDocumentFile(rows[0].storage_path);
  }

  return NextResponse.json({ ok: true });
});
